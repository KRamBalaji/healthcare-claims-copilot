# scripts/train_models.py
import os
from typing import List

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.multioutput import ClassifierChain
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.multiclass import OneVsRestClassifier

DATA_PATH = "data/claims_synthetic.csv"
MODELS_DIR = "models"


def load_data() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH)
    # turn denial_reasons from "a|b" into list
    df["denial_reasons_list"] = df["denial_reasons"].fillna("").apply(
        lambda x: [r for r in str(x).split("|") if r]
    )
    return df


def prepare_features(df: pd.DataFrame):
    # simple features for now
    feature_cols = [
        "service_type",
        "provider_type",
        "network_status",
        "has_referral",
        "has_prior_auth",
        "documentation_level",
        "billed_amount",
        "previous_claims_count",
        "previous_denials_count",
    ]

    X = df[feature_cols].copy()
    y_bin = df["label_approved"].astype(int)

    # build multi-label matrix Y_reasons
    all_reasons: List[str] = sorted(
        {r for lst in df["denial_reasons_list"] for r in lst}
    )
    print("Denial reason labels:", all_reasons)
    Y_reasons = np.zeros((len(df), len(all_reasons)), dtype=int)

    reason_index = {r: i for i, r in enumerate(all_reasons)}
    for row_idx, reasons in enumerate(df["denial_reasons_list"]):
        for r in reasons:
            Y_reasons[row_idx, reason_index[r]] = 1

    return X, y_bin, Y_reasons, all_reasons


def build_preprocessor(categorical_cols, numeric_cols):
    cat_transformer = OneHotEncoder(handle_unknown="ignore")
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", cat_transformer, categorical_cols),
            ("num", "passthrough", numeric_cols),
        ]
    )
    return preprocessor


def main():
    os.makedirs(MODELS_DIR, exist_ok=True)

    df = load_data()
    X, y_bin, Y_reasons, all_reasons = prepare_features(df)

    categorical_cols = [
        "service_type",
        "provider_type",
        "network_status",
        "documentation_level",
    ]
    numeric_cols = [
        "has_referral",
        "has_prior_auth",
        "billed_amount",
        "previous_claims_count",
        "previous_denials_count",
    ]

    preprocessor = build_preprocessor(categorical_cols, numeric_cols)

    # ----- Binary classifier: approval vs denial -----
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_bin, test_size=0.2, random_state=42, stratify=y_bin
    )

    clf_bin = Pipeline(
        steps=[
            ("pre", preprocessor),
            ("model", RandomForestClassifier(
                n_estimators=300,
                max_depth=None,
                random_state=42,
                n_jobs=-1,
            )),
        ]
    )

    print("\nTraining binary approval model...")
    clf_bin.fit(X_train, y_train)

    y_pred = clf_bin.predict(X_test)
    print("\nBinary approval model report:")
    print(classification_report(y_test, y_pred, digits=3))

    approval_model_path = os.path.join(MODELS_DIR, "approval_model.joblib")
    joblib.dump(
        {
            "pipeline": clf_bin,
            "feature_cols": X.columns.tolist(),
        },
        approval_model_path,
    )
    print(f"Saved binary model to {approval_model_path}")

    # ----- Multi-label classifier: denial reasons -----
    X_train_m, X_test_m, Y_train_m, Y_test_m = train_test_split(
        X, Y_reasons, test_size=0.2, random_state=42
    )

    multi_base = RandomForestClassifier(
        n_estimators=200,
        max_depth=None,
        random_state=42,
        n_jobs=-1,
    )

    clf_multi = Pipeline(
        steps=[
            ("pre", preprocessor),
            ("model", OneVsRestClassifier(multi_base)),
        ]
    )

    print("Training multi-label denial reasons model...")
    clf_multi.fit(X_train_m, Y_train_m)

    Y_pred_m = clf_multi.predict(X_test_m)
    print("Multi-label denial reasons sample (first 5 rows):")
    print("True:", Y_test_m[:5])
    print("Pred:", Y_pred_m[:5])

    joblib.dump(
        {
            "pipeline": clf_multi,
            "feature_cols": X.columns.tolist(),
            "reason_labels": all_reasons,
        },
        os.path.join(MODELS_DIR, "denial_reasons_model.joblib"),
    )
    print("Saved multi-label model to models/denial_reasons_model.joblib")


if __name__ == "__main__":
    main()
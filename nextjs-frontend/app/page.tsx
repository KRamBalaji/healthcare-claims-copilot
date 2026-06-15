// app/page.tsx
"use client";

/* Simple inline Card component to avoid missing module */
import React from "react";
const Card: React.FC<{ className?: string; children?: React.ReactNode }> = ({ className, children }) => {
  return <div className={className}>{children}</div>;
};
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";

export default function TriagePage() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Claim Triage</h2>
      <p className="text-sm text-muted-foreground">
        Enter claim details and patient question to predict denials and get explanations.
      </p>

      <Tabs defaultValue="triage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="triage">Triage</TabsTrigger>
          <TabsTrigger value="explanation">Explanation</TabsTrigger>
        </TabsList>

        <TabsContent value="triage" className="space-y-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">
              Claim input form will go here.
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">
              Model predictions (approval probability, denial reasons) will be shown here.
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="explanation">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">
              Natural-language explanation and suggested next steps will appear here.
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
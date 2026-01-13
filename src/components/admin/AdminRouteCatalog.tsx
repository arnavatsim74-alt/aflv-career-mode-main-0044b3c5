import { useState } from "react";
import { Upload, Database } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AdminRouteCatalog() {
  const [isImporting, setIsImporting] = useState(false);

  const importCsvText = async (csvText: string) => {
    setIsImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-route-catalog", {
        body: { csvText },
      });

      if (error) throw error;
      toast.success(`Imported ${data?.imported ?? 0} routes into catalog`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to import route catalog");
    } finally {
      setIsImporting(false);
    }
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    await importCsvText(text);
  };

  const importBundled = async () => {
    setIsImporting(true);
    try {
      // Try the new AFL_update.csv first, fallback to routes.csv
      let res = await fetch("/data/AFL_update.csv", { cache: "no-store" });
      if (!res.ok) {
        res = await fetch("/data/routes.csv", { cache: "no-store" });
      }
      if (!res.ok) throw new Error("No route CSV found in /public/data/");
      const text = await res.text();
      await importCsvText(text);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <SectionCard title="Route Catalog" icon={<Database className="h-5 w-5 text-muted-foreground" />}>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Import your route CSV once; it will be used for automatic vCAREER assignments.
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={isImporting}
            onClick={importBundled}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {isImporting ? "Importing..." : "Import bundled routes.csv"}
          </Button>

          <label className="inline-flex">
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={isImporting}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
            <Button type="button" disabled={isImporting} className="gap-2" asChild>
              <span>
                <Upload className="h-4 w-4" />
                {isImporting ? "Importing..." : "Upload CSV"}
              </span>
            </Button>
          </label>
        </div>

        <p className="text-xs text-muted-foreground">
          Tip: The app now includes your uploaded CSV at <span className="font-mono">/data/routes.csv</span>.
        </p>
      </div>
    </SectionCard>
  );
}

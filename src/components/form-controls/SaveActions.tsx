import { Save } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

export const SaveActions = ({
  onSave,
  disabled,
  label = "Save Changes",
}: any) => (
  <div className="pt-2">
    <Button
      onClick={onSave}
      disabled={disabled}
      className={cn(
        "w-full rounded",
        disabled && "cursor-not-allowed bg-muted-foreground"
      )}
    >
      <Save size={14} /> {disabled ? "No Changes" : label}
    </Button>
  </div>
);

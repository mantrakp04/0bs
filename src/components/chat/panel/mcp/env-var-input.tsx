import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import type { EnvVar } from "./types";

interface EnvVarInputProps {
  envVars: EnvVar[];
  onUpdate: (envVars: EnvVar[]) => void;
}

export const EnvVarInput = ({ envVars, onUpdate }: EnvVarInputProps) => {
  const addEnvVar = () => {
    onUpdate([...envVars, { key: "", value: "" }]);
  };

  const removeEnvVar = (index: number) => {
    onUpdate(envVars.filter((_, i) => i !== index));
  };

  const updateEnvVar = (
    index: number,
    field: "key" | "value",
    value: string,
  ) => {
    onUpdate(
      envVars.map((env, i) => (i === index ? { ...env, [field]: value } : env)),
    );
  };

  return (
    <div className="space-y-2">
      {envVars.map((env, index) => (
        <div key={index} className="flex gap-2">
          <Input
            placeholder="Key"
            value={env.key}
            onChange={(e) => updateEnvVar(index, "key", e.target.value)}
          />
          <span className="flex items-center">:</span>
          <Input
            placeholder="Value"
            value={env.value}
            onChange={(e) => updateEnvVar(index, "value", e.target.value)}
          />
          {index === envVars.length - 1 ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={addEnvVar}
            >
              <Plus className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => removeEnvVar(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};

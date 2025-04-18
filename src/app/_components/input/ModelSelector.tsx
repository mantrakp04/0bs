import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { models } from "./models";

export function ModelSelector() {
  return (
    <Select defaultValue="openai/gpt-4.1">
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Select model" />
      </SelectTrigger>
      <SelectContent>
        {models.map((model) => (
          <SelectItem key={model.value} value={model.value}>
            {model.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 
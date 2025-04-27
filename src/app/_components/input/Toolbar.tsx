import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { BotIcon, Settings2Icon, ArrowUpIcon } from "lucide-react";
import { AddButton } from "./AddButton";
import { ModelSelector } from "./ModelSelector";
import { usePanelStore } from "@/store/panelStore";

export function Toolbar() {
  const togglePanel = usePanelStore((state) => state.togglePanel);

  return (
    <div className="flex flex-row justify-between px-1 pb-1">
      <div className="flex flex-row gap-1">
        <AddButton />
        <Toggle
          variant="outline"
          className="cursor-pointer transition duration-300 data-[state=on]:bg-black/80 data-[state=on]:text-white dark:data-[state=on]:bg-white/80 dark:data-[state=on]:text-black"
        >
          <BotIcon />
          <span>Manus</span>
        </Toggle>
        <Button size="icon" variant="outline" onClick={togglePanel}>
          <Settings2Icon />
        </Button>
      </div>
      <div className="flex flex-row gap-1">
        <ModelSelector />
        <Button size="icon" variant="outline">
          <ArrowUpIcon />
        </Button>
      </div>
    </div>
  );
}

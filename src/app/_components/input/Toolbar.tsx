import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { BotIcon, FolderKanbanIcon, Settings2Icon, ArrowUpIcon } from "lucide-react";
import { AddButton } from "./AddButton";
import { ModelSelector } from "./ModelSelector";
import { usePanelStore } from "@/store/panelStore";

export function Toolbar() {
  const togglePanel = usePanelStore((state) => state.togglePanel);

  return (
    <div className="flex flex-row justify-between px-1 pb-1">
      <div className="flex flex-row gap-1">
        <AddButton />
        <Toggle variant="outline">
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
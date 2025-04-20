import { useSettingsStore } from "@/store/settingsStore";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Settings() {
  const { 
    systemPrompt, 
    temperature, 
    openai,
    setSystemPrompt, 
    setTemperature,
    setOpenAISettings,
    clearOpenAISettings,
  } = useSettingsStore();

  // Check if any OpenAI settings are filled
  const hasPartialOpenAISettings = !!(openai.baseUrl || openai.apiKey || openai.model);
  // Check if all OpenAI settings are filled
  const hasAllOpenAISettings = !!(openai.baseUrl && openai.apiKey && openai.model);
  // Show warning only when some settings are filled but not all
  const showWarning = hasPartialOpenAISettings && !hasAllOpenAISettings;

  return (
    <ScrollArea className="h-[calc(100vh-8rem)] px-4 py-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="systemPrompt">System Prompt</Label>
          <Textarea
            id="systemPrompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Enter your system prompt..."
            className="min-h-[200px] resize-none"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="temperature">Temperature</Label>
            <span className="text-sm text-muted-foreground">
              {temperature.toFixed(1)}
            </span>
          </div>
          <Slider
            id="temperature"
            min={0}
            max={1}
            step={0.1}
            value={[temperature]}
            onValueChange={([value]) => setTemperature(value ?? temperature)}
          />
          <p className="text-xs text-muted-foreground">
            Adjust how creative or focused the responses should be. Lower values make responses more focused and deterministic, while higher values make them more creative and varied.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="openai">
            <AccordionTrigger>Custom OpenAI Settings</AccordionTrigger>
            <AccordionContent className="space-y-4">
              {showWarning && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    All OpenAI settings must be filled to enable custom configuration.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="openai-base-url">Base URL</Label>
                <Input
                  id="openai-base-url"
                  value={openai.baseUrl ?? ""}
                  onChange={(e) => setOpenAISettings({ baseUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="openai-api-key">API Key</Label>
                <Input
                  id="openai-api-key"
                  type="password"
                  value={openai.apiKey ?? ""}
                  onChange={(e) => setOpenAISettings({ apiKey: e.target.value })}
                  placeholder="sk-..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="openai-model">Model</Label>
                <Input
                  id="openai-model"
                  value={openai.model ?? ""}
                  onChange={(e) => setOpenAISettings({ model: e.target.value })}
                  placeholder="gpt-4-turbo-preview"
                />
              </div>

              {hasPartialOpenAISettings && (
                <Button 
                  variant="outline" 
                  onClick={clearOpenAISettings}
                  className="w-full"
                >
                  Clear OpenAI Settings
                </Button>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </ScrollArea>
  );
}
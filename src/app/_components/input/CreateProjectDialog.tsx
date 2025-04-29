"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusIcon } from "lucide-react";
import { api } from "@/trpc/react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { useProjectStore } from "@/store/projectStore";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(256),
  description: z.string().max(1000).optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();
  const { user, isLoaded } = useUser();
  const setSelectedProject = useProjectStore((state) => state.setSelectedProject);
  const clearSelectedProject = useProjectStore((state) => state.clearSelectedProject);

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const createProject = api.project.create.useMutation({
    onSuccess: async (newProject) => {
      // Close the dialog
      setOpen(false);
      // Reset the form
      form.reset();
      // Clear any existing selected project first
      clearSelectedProject();
      // Then set the newly created project as selected
      if (newProject) {
        setSelectedProject(newProject);
        toast.success(`Project "${newProject.name}" created successfully`);
      }
      // Invalidate the projects query to trigger a refetch
      await utils.project.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create project");
    },
  });

  const onSubmit = (data: ProjectFormData) => {
    if (!user) {
      toast.error("You must be logged in to create a project");
      return;
    }
    createProject.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Start a new Project
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Create a new project to organize your files and resources.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Awesome Project" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of your project"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="submit"
                disabled={createProject.isPending || !isLoaded || !user}
              >
                {createProject.isPending ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

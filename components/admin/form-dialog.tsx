"use client";

import { useRef, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FormTab {
  value: string;
  label: string;
  content: ReactNode;
}

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  tabs?: FormTab[];
  children?: ReactNode;
  onSave?: (formData: FormData) => void; // Updated to expect FormData
  onCancel?: () => void;
  saveLabel?: string;
  isLoading?: boolean;
  formId?: string; // Added formId prop
  onSubmit?: (formData: FormData) => void | Promise<void>;
  fields?: {
    value: string;
    label: string;
    content: JSX.Element;
  }[];
  initialData?: any;
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  tabs,
  children,
  onSave,
  onCancel,
  saveLabel = "Save",
  isLoading = false,
  formId, // Destructure formId
}: FormDialogProps) {
  const formRef = useRef<HTMLFormElement>(null); // Ref to the form element

  const handleSaveClick = () => {
    if (formRef.current) {
      const formData = new FormData(formRef.current);
      onSave(formData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form ref={formRef} id={formId}>
          {" "}
          {/* Attach ref and id to the form */}
          {tabs ? (
            <Tabs defaultValue={tabs[0]?.value} className="w-full">
              <TabsList className={`grid w-full grid-cols-${tabs.length}`}>
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {tabs.map((tab) => (
                <TabsContent
                  key={tab.value}
                  value={tab.value}
                  className="space-y-4"
                >
                  {tab.content}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="space-y-4">{children}</div>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSaveClick} disabled={isLoading}>
            {" "}
            {/* Call handleSaveClick */}
            {isLoading ? "Saving..." : saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

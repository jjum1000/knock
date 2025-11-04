"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";

interface Variable {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  required: boolean;
  defaultValue?: any;
  description?: string;
}

interface TemplateVariablesProps {
  variables: Variable[];
  onChange: (variables: Variable[]) => void;
}

export function TemplateVariables({ variables, onChange }: TemplateVariablesProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const addVariable = () => {
    onChange([
      ...variables,
      {
        name: "",
        type: "string",
        required: false,
        description: "",
      },
    ]);
    setEditingIndex(variables.length);
  };

  const updateVariable = (index: number, field: keyof Variable, value: any) => {
    const updated = [...variables];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeVariable = (index: number) => {
    onChange(variables.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const getDefaultValuePlaceholder = (type: Variable["type"]) => {
    switch (type) {
      case "string":
        return "Enter default string...";
      case "number":
        return "0";
      case "boolean":
        return "true or false";
      case "object":
        return '{"key": "value"}';
      case "array":
        return '["item1", "item2"]';
      default:
        return "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Template Variables</h3>
          <p className="text-sm text-muted-foreground">
            Define variables that will be used in the template
          </p>
        </div>
        <Button onClick={addVariable} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Variable
        </Button>
      </div>

      {variables.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No variables defined yet. Click "Add Variable" to get started.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {variables.map((variable, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-4">
                    {/* Variable Name */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Variable Name</Label>
                        <Input
                          placeholder="e.g., userName, age, interests"
                          value={variable.name}
                          onChange={(e) =>
                            updateVariable(index, "name", e.target.value)
                          }
                        />
                      </div>

                      {/* Variable Type */}
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                          value={variable.type}
                          onValueChange={(v: Variable["type"]) =>
                            updateVariable(index, "type", v)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="string">String</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="boolean">Boolean</SelectItem>
                            <SelectItem value="object">Object</SelectItem>
                            <SelectItem value="array">Array</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label>Description (Optional)</Label>
                      <Input
                        placeholder="Describe what this variable is for..."
                        value={variable.description || ""}
                        onChange={(e) =>
                          updateVariable(index, "description", e.target.value)
                        }
                      />
                    </div>

                    {/* Default Value */}
                    <div className="space-y-2">
                      <Label>Default Value (Optional)</Label>
                      <Textarea
                        placeholder={getDefaultValuePlaceholder(variable.type)}
                        value={
                          typeof variable.defaultValue === "object"
                            ? JSON.stringify(variable.defaultValue, null, 2)
                            : variable.defaultValue || ""
                        }
                        onChange={(e) => {
                          let value: any = e.target.value;
                          // Try to parse JSON for objects and arrays
                          if (
                            (variable.type === "object" ||
                              variable.type === "array") &&
                            value
                          ) {
                            try {
                              value = JSON.parse(value);
                            } catch {
                              // Keep as string if parsing fails
                            }
                          } else if (variable.type === "number" && value) {
                            value = Number(value);
                          } else if (variable.type === "boolean" && value) {
                            value = value === "true";
                          }
                          updateVariable(index, "defaultValue", value);
                        }}
                        rows={variable.type === "object" || variable.type === "array" ? 4 : 2}
                      />
                    </div>

                    {/* Required Switch */}
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={variable.required}
                        onCheckedChange={(checked) =>
                          updateVariable(index, "required", checked)
                        }
                      />
                      <Label>Required variable</Label>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeVariable(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

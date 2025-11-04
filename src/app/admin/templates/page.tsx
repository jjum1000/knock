"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { TemplateFilters } from "./components/TemplateFilters";
import { TemplateList } from "./components/TemplateList";
import { adminApi } from "@/lib/api/admin";
import { PromptTemplate } from "@/lib/types/admin";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function TemplatesPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "updated_at" | "version">("updated_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  // Preview dialog
  const [previewTemplate, setPreviewTemplate] = useState<PromptTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [searchQuery, statusFilter, sectionFilter, sortBy, sortOrder, page, limit]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      if (searchQuery) {
        params.search = searchQuery;
      }

      if (statusFilter !== "all") {
        params.is_active = statusFilter === "active";
      }

      if (sectionFilter !== "all") {
        params.section_type = sectionFilter;
      }

      const response = await adminApi.templates.getAll(params);
      setTemplates(response.data);
      setTotal(response.total);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminApi.templates.delete(id);
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
      loadTemplates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSectionFilter("all");
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Templates</h1>
          <p className="text-muted-foreground mt-1">
            Manage Handlebars templates for system prompts
          </p>
        </div>
        <Button onClick={() => router.push("/admin/templates/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <TemplateFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          sectionFilter={sectionFilter}
          onSectionChange={setSectionFilter}
          onReset={handleResetFilters}
        />

        {/* Sort & Limit */}
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="updated_at">Updated</SelectItem>
              <SelectItem value="version">Version</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Asc</SelectItem>
              <SelectItem value="desc">Desc</SelectItem>
            </SelectContent>
          </Select>

          <Select value={limit.toString()} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="text-sm text-muted-foreground">
        Showing {templates.length} of {total} templates
      </div>

      {/* Table */}
      <TemplateList
        templates={templates}
        loading={loading}
        onDelete={handleDelete}
        onPreview={setPreviewTemplate}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {previewTemplate?.name} (v{previewTemplate?.version})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">Description</div>
              <p className="text-sm text-muted-foreground">
                {previewTemplate?.description || "No description"}
              </p>
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Template Content</div>
              <SyntaxHighlighter
                language="handlebars"
                style={vscDarkPlus}
                customStyle={{ borderRadius: "0.5rem", fontSize: "0.875rem" }}
              >
                {previewTemplate?.template_content || ""}
              </SyntaxHighlighter>
            </div>
            {previewTemplate?.variable_schema && (
              <div>
                <div className="text-sm font-medium mb-2">Variable Schema</div>
                <SyntaxHighlighter
                  language="json"
                  style={vscDarkPlus}
                  customStyle={{ borderRadius: "0.5rem", fontSize: "0.875rem" }}
                >
                  {JSON.stringify(previewTemplate.variable_schema, null, 2)}
                </SyntaxHighlighter>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import type { editor } from "monaco-editor";

interface TemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  readOnly?: boolean;
}

export function TemplateEditor({
  value,
  onChange,
  height = "500px",
  readOnly = false,
}: TemplateEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  function handleEditorDidMount(editor: editor.IStandaloneCodeEditor) {
    editorRef.current = editor;
  }

  function handleEditorChange(value: string | undefined) {
    onChange(value || "");
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Editor
        height={height}
        defaultLanguage="handlebars"
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: "on",
          readOnly,
          wordWrap: "on",
          automaticLayout: true,
          scrollBeyondLastLine: false,
          tabSize: 2,
          folding: true,
          formatOnPaste: true,
          formatOnType: true,
          suggest: {
            showSnippets: true,
          },
        }}
      />
    </div>
  );
}

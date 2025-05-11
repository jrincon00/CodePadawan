"use client"; // 🔥 Asegura que es un componente de Next.js
import React from "react";
import CodeEditor from "@/components/CodeEditor";
import CodeEditorJava from "@/components/CodeEditorJava";
import CodeEditorJavaScript from "@/components/CodeEditorJavaScript";
import CodeEditorPython from "@/components/CodeEditorPython";
import CodeEditorHtml from "@/components/CodeEditorHtml";

export default function Home() {
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", background:"" }}>

      <CodeEditorJava />
      <CodeEditorJavaScript />
      <CodeEditorPython />
      <CodeEditorHtml />
    </div>
  );
}

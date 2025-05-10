"use client"; // 🔥 Asegura que es un componente de Next.js
import React from "react";
import CodeEditor from "@/components/CodeEditor";

export default function Home() {
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", background:"" }}>


      <CodeEditor />

    </div>
  );
}

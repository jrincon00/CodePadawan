"use client";
import React, { useEffect, useRef, useState } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { html } from "@codemirror/lang-html";
import { java } from "@codemirror/lang-java";
import { oneDark } from "@codemirror/theme-one-dark";
import { keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { PyodideInterface } from "../types/pyodide";

const loadPyodide = async (): Promise<PyodideInterface> => {
  console.log("🔄 Cargando Pyodide...");
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/pyodide/v0.24.0/full/pyodide.js";
  script.async = true;
  document.body.appendChild(script);

  return new Promise((resolve, reject) => {
    script.onload = async () => {
      if (!(window as any).loadPyodide) {
        reject("❌ Pyodide no se cargó correctamente.");
        return;
      }
      const pyodide = await (window as any).loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.0/full/",
      });
      console.log("✅ Pyodide cargado correctamente");
      resolve(pyodide as PyodideInterface);
    };
    script.onerror = () => reject("❌ Error al cargar Pyodide desde el CDN.");
  });
};

const CodeEditor: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstance = useRef<EditorView | null>(null);
  const [code, setCode] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  const [language, setLanguage] = useState<"javascript" | "python" | "html" | "java">("javascript");
  const [pyodideInstance, setPyodideInstance] = useState<PyodideInterface | null>(null);
  const [isPyodideReady, setIsPyodideReady] = useState<boolean>(false);

  const customTheme = EditorView.theme({
    "& .cm-content": { fontFamily: "'Fira Code', monospace", fontSize: "16px", color: "#ff5733" },
    "& .cm-editor": { backgroundColor: "#000" },
    "&.cm-line": { overflowWrap: "break-word" },
  });

  useEffect(() => {
    loadPyodide()
      .then((pyodide) => {
        setPyodideInstance(pyodide);
        setIsPyodideReady(true);
      })
      .catch((error) => console.error("❌ Error al cargar Pyodide:", error));
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;

    const initialDoc =
      language === "javascript"
        ? "console.log('hola');"
        : language === "python"
        ? 'print("¡Hola, mundo! 🚀")'
        : language === "html"
        ? `<h1 style="font-size: 24px; color: blue;">Título Principal</h1>
<p style="font-size: 16px;">Este es un párrafo.</p>
<div style="font-size: 14px; color: green;">Contenido en div</div>`
        : 'System.out.println("Hola desde Java");';

    console.log(`Initializing editor for language: ${language}`);

    const state = EditorState.create({
      doc: initialDoc,
      extensions: [
        basicSetup,
        language === "javascript"
          ? javascript()
          : language === "python"
          ? python()
          : language === "html"
          ? html()
          : java(),
        oneDark,
        customTheme,
        keymap.of(defaultKeymap),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            setCode(update.state.doc.toString());
          }
        }),
      ],
    });

    if (editorInstance.current) {
      editorInstance.current.destroy();
      editorInstance.current = null;
    }

    editorInstance.current = new EditorView({
      state,
      parent: editorRef.current,
    });

    console.log(`Editor initialized for ${language}`);

    return () => {
      if (editorInstance.current) {
        editorInstance.current.destroy();
        editorInstance.current = null;
      }
    };
  }, [language]);

  const ejecutarCodigo = async () => {
    const codigo = editorInstance.current?.state.doc.toString();
    if (!codigo) {
      setOutput("❌ No hay código para ejecutar.");
      return;
    }

    try {
      if (language === "javascript") {
        let consoleOutput = "";
        const originalLog = console.log;
        console.log = (...args) => {
          consoleOutput += args.join(" ") + "\n";
          originalLog(...args);
        };
        const resultado = eval(codigo);
        console.log = originalLog;
        setOutput(consoleOutput || resultado?.toString() || "❌ No se recibió salida.");
      } else if (language === "python") {
        if (!pyodideInstance) {
          setOutput("❌ Pyodide aún no está listo, intenta nuevamente...");
          return;
        }
        const wrappedCode = `
import sys
import io
sys.stdout = io.StringIO()
${codigo.trim()}
sys.stdout.getvalue()`;
        const output = await pyodideInstance.runPythonAsync(wrappedCode);
        setOutput(output || "❌ No se recibió salida.");
      } else if (language === "html") {
        // Wrap HTML in a basic document with CSS reset for consistent rendering
        const wrappedHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Minimal CSS reset to ensure consistent default styles */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    h1 { font-size: 2em; font-weight: bold; margin-bottom: 0.5em; }
    p { font-size: 1em; margin-bottom: 1em; }
    div { font-size: 1em; }
  </style>
</head>
<body>
${codigo}
</body>
</html>`;
        setOutput(wrappedHtml);
      } else if (language === "java") {
        const wrappedCode = `
public class Main {
  public static void main(String[] args) {
    ${codigo}
  }
}`;
        try {
          const response = await fetch("http://localhost:5000/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: wrappedCode }),
          });
          if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
          }
          const data = await response.json();
          setOutput(data.output || "❌ No se recibió salida.");
        } catch (error) {
          console.error("Fetch error:", error);
          setOutput(
            "❌ Error: No se pudo conectar con el servidor. Asegúrate de que el servidor esté corriendo en http://localhost:5000."
          );
        }
      }
    } catch (error) {
      setOutput(`❌ Error: ${error}`);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Editor de Código</h1>
      <div style={{ marginBottom: "10px" }}>
        <select
          onChange={(e) => setLanguage(e.target.value as "javascript" | "python" | "html" | "java")}
          style={{ padding: "8px", fontSize: "16px" }}
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="html">HTML</option>
          <option value="java">Java</option>
        </select>
      </div>
      <div
        ref={editorRef}
        style={{
          border: "1px solid #ccc",
          minHeight: "200px",
          borderRadius: "8px",
          overflow: "hidden",
          boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.2)",
        }}
      />
      <button
        onClick={ejecutarCodigo}
        disabled={!isPyodideReady && language === "python"}
        style={{
          marginTop: "10px",
          padding: "8px 16px",
          borderRadius: "5px",
          background: language === "java" ? "#4CAF50" : "#FF9800",
          color: "white",
          border: "none",
          cursor: "pointer",
          opacity: !isPyodideReady && language === "python" ? 0.5 : 1,
        }}
      >
        {isPyodideReady || language !== "python" ? "Ejecutar Código" : "Cargando Pyodide..."}
      </button>
      <div
        style={{
          marginTop: "20px",
          padding: "10px",
          background: "#1e1e1e",
          color: "#fff",
          borderRadius: "5px",
          textAlign: "left",
          border: "1px solid #ddd",
        }}
      >
        {language === "html" ? (
          <div dangerouslySetInnerHTML={{ __html: output }} />
        ) : (
          <>
            <strong>Salida:</strong>
            <pre>{output || "Aquí se mostrará la salida..."}</pre>
          </>
        )}
      </div>
    </div>
  );
};

export default CodeEditor;
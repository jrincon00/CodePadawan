
"use client";
import React, { useEffect, useRef, useState } from "react";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { PyodideInterface } from "../types/pyodide";
import { html } from "@codemirror/lang-html";


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

      console.log("✅ Pyodide disponible:", (window as any).loadPyodide);
      const pyodide = await (window as any).loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.0/full/",
      });

      console.log("✅ Pyodide cargado correctamente");
      resolve(pyodide as PyodideInterface);
    };

    script.onerror = () => {
      reject("❌ Error al cargar Pyodide desde el CDN.");
    };
  });
};

const CodeEditor: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  let editorViewRef = useRef<EditorView | null>(null);

  const [output, setOutput] = useState<string>("");
  const [language, setLanguage] = useState<"javascript" | "python" | "html">("javascript");
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
        : "<h1>¡Ejecutando HTML!</h1>";

    const state = EditorState.create({
      doc: initialDoc,
      extensions: [
        language === "javascript"
          ? javascript()
          : language === "python"
          ? python()
          : html(),
        oneDark,
        customTheme,
        keymap.of(defaultKeymap),
      ],
    });

    editorViewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    });

    return () => {
      editorViewRef.current?.destroy();
    };
  }, [language]);

const ejecutarCodigo = async () => {
  const codigo = editorViewRef.current?.state.doc.toString();
  if (!codigo) {
    setOutput("❌ No hay código para ejecutar.");
    return;
  }

  try {
    if (language === "javascript") {
      console.log("✅ Ejecutando código JavaScript...");
      
      let consoleOutput = "";
      const originalLog = console.log;
      
      console.log = (...args) => {
        consoleOutput += args.join(" ") + "\n"; // 🔥 Capturar salida de console.log()
        originalLog(...args); // Mantener funcionalidad en la consola
      };

      const resultado = eval(codigo); // ✅ Evalúa el código
      console.log = originalLog; // Restaurar console.log

      setOutput(consoleOutput || resultado?.toString() || "❌ No se recibió salida.");
    } else if (language === "python") {
      if (!pyodideInstance) {
        setOutput("❌ Pyodide aún no está listo, intenta nuevamente...");
        return;
      }

      console.log("✅ Ejecutando código Python...");
   const wrappedCode = `
import sys
import io
sys.stdout = io.StringIO()
${codigo.trim()}
sys.stdout.getvalue()`;


      const output = await pyodideInstance.runPythonAsync(wrappedCode);
      console.log("🔎 Salida corregida de Python:", output);
      setOutput(output || "❌ No se recibió salida.");
    } else if (language === "html") {
  console.log("🔎 Contenido de output:", codigo); // 🔥 Verifica qué se está enviando antes de renderizarlo
  setOutput(codigo); // 🔥 Renderiza HTML correctamente
} else {
  setOutput("HTML ingresado: " + codigo);
}

  } catch (error) {
    console.error("❌ Error general en ejecución:", error);
    setOutput(`❌ Error: ${error}`);
  }
};

return (
  <div>
    <h1>Editor de Código</h1>

    <select onChange={(e) => setLanguage(e.target.value as "javascript" | "python" | "html")}>
      <option value="javascript">JavaScript</option>
      <option value="python">Python</option>
      <option value="html">HTML</option>
    </select>

    <div ref={editorRef} style={{ border: "1px solid #ccc", minHeight: "200px" }} />

    <button onClick={ejecutarCodigo} style={{ marginTop: "10px" }} disabled={!isPyodideReady}>
      {isPyodideReady ? "Ejecutar Código" : "Cargando Pyodide..."}
    </button>

    {/* 🔥 Renderiza HTML correctamente en la salida */}
 <div style={{ marginTop: "10px", padding: "10px", border: "1px solid #ddd" }}>
  {language === "html" ? (
    <div dangerouslySetInnerHTML={{ __html: output }} />
  ) : (
    <>
      <strong>Salida:</strong> <pre>{output}</pre>
    </>
  )}
</div>

  </div>
);
};

export default CodeEditor;

"use client"

import { CodeMirrorBlock } from "./code-mirror-block"

const testCode = `function hello(name) {
  console.log("Hello, " + name + "!");
  const result = {
    message: "world",
    count: 42
  };
  return result;
}`

const testPython = `def hello(name):
    print(f"Hello, {name}!")
    result = {
        "message": "world", 
        "count": 42
    }
    return result`

export function TestCodeMirror() {
  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-bold">CodeMirror Test</h2>
      
      <div>
        <h3 className="text-md font-semibold mb-2">JavaScript Test</h3>
        <CodeMirrorBlock 
          code={testCode}
          language="javascript"
        />
      </div>

      <div>
        <h3 className="text-md font-semibold mb-2">Python Test</h3>
        <CodeMirrorBlock 
          code={testPython}
          language="python"
        />
      </div>

      <div>
        <h3 className="text-md font-semibold mb-2">Plain Text Test</h3>
        <CodeMirrorBlock 
          code="This is plain text with no syntax highlighting"
          language="text"
        />
      </div>
    </div>
  )
}
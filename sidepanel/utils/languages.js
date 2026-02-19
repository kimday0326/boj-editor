window.BOJEditor = window.BOJEditor || {};

const LANGUAGES = {
  'Python 3': {
    piston: { language: 'python', version: '3.10.0' },
    monaco: 'python',
    extension: 'py',
    template: 'import sys\ninput = sys.stdin.readline\n\n',
  },
  'PyPy3': {
    piston: { language: 'python', version: '3.10.0' },
    monaco: 'python',
    extension: 'py',
    template: 'import sys\ninput = sys.stdin.readline\n\n',
  },
  'C++17': {
    piston: { language: 'c++', version: '10.2.0' },
    monaco: 'cpp',
    extension: 'cpp',
    template: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    \n    return 0;\n}\n',
  },
  'C99': {
    piston: { language: 'c', version: '10.2.0' },
    monaco: 'c',
    extension: 'c',
    template: '#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}\n',
  },
  'Java 11': {
    piston: { language: 'java', version: '15.0.2' },
    monaco: 'java',
    extension: 'java',
    template: 'import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n        \n    }\n}\n',
  },
  'Ruby': {
    piston: { language: 'ruby', version: '3.0.1' },
    monaco: 'ruby',
    extension: 'rb',
    template: '',
  },
  'Kotlin (JVM)': {
    piston: { language: 'kotlin', version: '1.8.20' },
    monaco: 'kotlin',
    extension: 'kt',
    template: 'fun main() {\n    \n}\n',
  },
  'Swift': {
    piston: { language: 'swift', version: '5.3.3' },
    monaco: 'swift',
    extension: 'swift',
    template: 'import Foundation\n\n',
  },
  'C#': {
    piston: { language: 'csharp.net', version: '5.0.201' },
    monaco: 'csharp',
    extension: 'cs',
    template: 'using System;\n\nclass Program {\n    static void Main(string[] args) {\n        \n    }\n}\n',
  },
  'Node.js': {
    piston: { language: 'javascript', version: '18.15.0' },
    monaco: 'javascript',
    extension: 'js',
    template: "const readline = require('readline');\nconst rl = readline.createInterface({ input: process.stdin });\nconst lines = [];\nrl.on('line', (line) => lines.push(line));\nrl.on('close', () => {\n    \n});\n",
  },
  'Go': {
    piston: { language: 'go', version: '1.16.2' },
    monaco: 'go',
    extension: 'go',
    template: 'package main\n\nimport (\n\t"bufio"\n\t"fmt"\n\t"os"\n)\n\nfunc main() {\n\treader := bufio.NewReader(os.Stdin)\n\t_ = reader\n\tfmt.Println()\n}\n',
  },
  'D': {
    piston: { language: 'd', version: '10.2.0' },
    monaco: 'd',
    extension: 'd',
    template: 'import std.stdio;\n\nvoid main() {\n    \n}\n',
  },
  'Rust 2018': {
    piston: { language: 'rust', version: '1.68.2' },
    monaco: 'rust',
    extension: 'rs',
    template: 'use std::io::{self, BufRead};\n\nfn main() {\n    let stdin = io::stdin();\n    \n}\n',
  },
};

function getLanguageNames() {
  return Object.keys(LANGUAGES);
}

function getPistonConfig(languageName) {
  return LANGUAGES[languageName]?.piston ?? null;
}

function getMonacoLanguage(languageName) {
  return LANGUAGES[languageName]?.monaco ?? 'plaintext';
}

function getTemplate(languageName) {
  return LANGUAGES[languageName]?.template ?? '';
}

function getFileExtension(languageName) {
  return LANGUAGES[languageName]?.extension ?? 'txt';
}

window.BOJEditor.Languages = {
  LANGUAGES,
  getLanguageNames,
  getPistonConfig,
  getMonacoLanguage,
  getTemplate,
  getFileExtension,
};

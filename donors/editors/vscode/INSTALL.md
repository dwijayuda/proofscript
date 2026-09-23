# Install ProofScript VS Code 0.46.0

Install the `.vsix` **from Visual Studio Code**, not the Visual Studio VSIX Installer.

```powershell
code --install-extension "D:\\DL\\proofscript-vscode-0.46.0-p5101-lsp-adapter.vsix" --force
```

Then run **Developer: Reload Window** from the Command Palette.

Open any `.ps` file. You should see:

- `ProofScript` in the bottom-left status bar;
- the ProofScript Infoview in the right Secondary Side Bar;
- compiler/kernel diagnostics and semantic language features.

The extension bundles its own matching LSP. `proofscript.lsp.path` is only needed when compiler developers deliberately want to use another server build.

For dogfood debugging, run **ProofScript: Run Doctor** from the Command Palette after opening a `.ps` file.

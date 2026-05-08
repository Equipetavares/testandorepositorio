// Inicializar ícones da biblioteca Lucide
    lucide.createIcons();

    // Estado global
    let downloadUrl = null;
    let downloadBlob = null;

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    function switchScreen(screenId) {
      document.getElementById('screen-input').classList.add('hidden');
      document.getElementById('screen-input').classList.remove('flex');
      
      document.getElementById('screen-processing').classList.add('hidden');
      document.getElementById('screen-processing').classList.remove('flex');
      
      document.getElementById('screen-success').classList.add('hidden');

      const target = document.getElementById(screenId);
      target.classList.remove('hidden');
      if(screenId !== 'screen-success') {
        target.classList.add('flex');
      }
    }

    async function processAndSplitCode() {
      const rawCode = document.getElementById('rawCode').value;
      
      if (!window.JSZip) {
        alert("Aguarde o carregamento das dependências (JSZip).");
        return;
      }

      if (!rawCode.trim()) {
        alert("Por favor, cole o seu código antes de gerar a pasta.");
        return;
      }

      if (rawCode.includes('import React') || rawCode.includes('export default function')) {
        alert("Aviso: O sistema detetou código React. Este sistema foi desenhado para analisar HTML estático com <style> e <script>.");
      }

      switchScreen('screen-processing');

      try {
        const stepEl = document.getElementById('processingStep');
        
        stepEl.textContent = 'A analisar a árvore do documento (DOM)...';
        await delay(800);
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawCode, 'text/html');
        
        let cssContent = '';
        let jsContent = '';

        stepEl.textContent = 'A extrair e compilar folhas de estilo (CSS)...';
        await delay(800);
        
        const styles = doc.querySelectorAll('style');
        styles.forEach(style => {
          cssContent += style.textContent + '\n\n'; 
          style.remove();
        });

        stepEl.textContent = 'A isolar a lógica e scripts (JavaScript)...';
        await delay(800);
        
        const scripts = doc.querySelectorAll('script:not([src])');
        scripts.forEach(script => {
          jsContent += script.textContent + '\n\n';
          script.remove();
        });

        stepEl.textContent = 'A reconstruir o HTML e a injetar novas referências...';
        await delay(800);

        if (cssContent.trim() !== '') {
          const linkElem = doc.createElement('link');
          linkElem.rel = 'stylesheet';
          linkElem.href = 'css/style.css';
          doc.head.appendChild(linkElem);
        }

        if (jsContent.trim() !== '') {
          const scriptElem = doc.createElement('script');
          scriptElem.src = 'js/script.js';
          doc.body.appendChild(scriptElem);
        }

        let finalHtml = doc.documentElement.outerHTML;

        const hasDoctype = /^<!DOCTYPE/i.test(rawCode.trim());
        if (hasDoctype || rawCode.toLowerCase().includes('<!doctype html>')) {
          finalHtml = '<!DOCTYPE html>\n' + finalHtml;
        }

        finalHtml = finalHtml.replace(/^\s*[\r\n]/gm, '');

        stepEl.textContent = 'A gerar a estrutura de pastas segura para o GitHub...';
        await delay(800);

        const zip = new window.JSZip();
        const rootFolder = zip.folder("meu-projeto-github");

        rootFolder.file("index.html", finalHtml.trim());

        if (cssContent.trim() !== '') {
          rootFolder.file("css/style.css", cssContent.trim());
        }

        if (jsContent.trim() !== '') {
          rootFolder.file("js/script.js", jsContent.trim());
        }

        rootFolder.file("README.md", "# O Meu Projeto\n\nProjeto separado com segurança e empacotado automaticamente.");
        rootFolder.file(".gitignore", "node_modules/\n.DS_Store\n");

        downloadBlob = await zip.generateAsync({ type: "blob" });
        const base64Content = await zip.generateAsync({ type: "base64" });
        downloadUrl = "data:application/zip;base64," + base64Content;

        // Atualizar campos de texto de visualização
        document.getElementById('out-html').value = finalHtml.trim();
        document.getElementById('out-css').value = cssContent.trim();
        document.getElementById('out-js').value = jsContent.trim();

        document.getElementById('section-html').style.display = finalHtml.trim() ? 'block' : 'none';
        document.getElementById('section-css').style.display = cssContent.trim() ? 'block' : 'none';
        document.getElementById('section-js').style.display = jsContent.trim() ? 'block' : 'none';

        switchScreen('screen-success');

      } catch (error) {
        console.error("Erro ao processar o código:", error);
        alert("Houve um erro grave ao tentar analisar o código. Verifique se o HTML base não está totalmente corrompido.");
        switchScreen('screen-input');
      }
    }

    function resetSystem() {
      document.getElementById('rawCode').value = '';
      downloadUrl = null;
      downloadBlob = null;
      switchScreen('screen-input');
    }

    async function triggerDownload() {
      if (!downloadUrl || !downloadBlob) return;
      
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: 'projeto-github-pronto.zip',
            types: [{
              description: 'Ficheiro ZIP',
              accept: {'application/zip': ['.zip']},
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(downloadBlob);
          await writable.close();
          return; 
        } catch (err) {
          if (err.name === 'AbortError') return; 
        }
      }

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = "projeto-github-pronto.zip";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    function copyToClipboard(elementId) {
      const textArea = document.getElementById(elementId);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('Código copiado com sucesso!');
      } catch (err) {
        console.error('Falha ao copiar', err);
      }
    }
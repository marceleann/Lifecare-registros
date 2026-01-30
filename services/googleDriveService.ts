import { GOOGLE_SCRIPT_URL, DRIVE_FOLDER_ID } from '../constants';

type DataType = 'report' | 'user' | 'shift' | 'form_response';

// Função para buscar TODOS os dados do servidor ao iniciar
export const fetchData = async () => {
  if (!GOOGLE_SCRIPT_URL) {
    console.warn("Google Script URL not configured.");
    return null;
  }

  try {
    console.log("[Google Drive] Iniciando busca de dados (Simple GET)...");
    
    // --- CORREÇÃO TÉCNICA DE CORS ---
    // Removemos 'headers' completamente. Isso transforma a requisição em uma "Simple Request".
    // Navegadores (especialmente mobile) não exigem 'OPTIONS' (preflight) para simple requests.
    // O Google Apps Script NÃO suporta preflight, por isso falhava antes.
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=readAll&t=${new Date().getTime()}`, {
      method: 'GET',
      redirect: "follow"
    });

    if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
    }

    const text = await response.text();
    
    // Verifica se retornou a página de login do Google (erro comum de permissão) ou HTML de erro
    if (text.trim().startsWith("<!DOCTYPE") || text.includes("Google Accounts")) {
        console.error("[Google Drive] Erro de Permissão: O script retornou HTML. Verifique se a implantação está como 'Qualquer Pessoa' e 'Executar como Eu'.");
        return null;
    }

    try {
        const data = JSON.parse(text);
        return data;
    } catch (e) {
        console.error("[Google Drive] JSON inválido recebido:", text.substring(0, 100));
        return null;
    }

  } catch (error) {
    console.error("[Google Drive] Erro de conexão:", error);
    return null;
  }
};

export const saveToDrive = async (type: DataType, data: any) => {
  if (!GOOGLE_SCRIPT_URL) {
    console.warn("Google Script URL not configured. Data not saved to Drive.");
    return false;
  }

  try {
    // Envelope os dados
    const payload = JSON.stringify({
      folderId: DRIVE_FOLDER_ID,
      type: type,
      data: data
    });

    // --- CORREÇÃO TÉCNICA DE POST ---
    // Usamos text/plain explicitamente. O Google Apps Script lê o body corretamente
    // sem disparar bloqueios de segurança do navegador.
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      redirect: "follow",
      body: payload,
      headers: {
        "Content-Type": "text/plain;charset=utf-8", 
      },
    });

    console.log(`[Google Drive] Dados do tipo ${type} enviados com sucesso.`);
    return true;
  } catch (error) {
    console.error("[Google Drive] Erro ao salvar dados:", error);
    return false;
  }
};
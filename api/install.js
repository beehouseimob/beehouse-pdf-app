import { saveTokens, call } from '../utils/b24.js';

export default async function handler(req, res) {
    
    const params = { ...req.query, ...req.body };
    const AUTH_ID = params.AUTH_ID;
    const REFRESH_ID = params.REFRESH_ID;
    const domain = params.DOMAIN;

    if (!AUTH_ID || !domain) {
        const errorMsg = "Erro: Parametros de instalacao (AUTH_ID, DOMAIN) nao recebidos.";
        console.error(errorMsg, params);
        return res.status(400).send(errorMsg);
    }

    try {
        const tokens = {
            access_token: AUTH_ID,
            refresh_token: REFRESH_ID,
            domain: domain
        };
        await saveTokens(tokens);

        const handlerUrl = `https://${req.headers.host}/api/handler`;
        
        // --- MELHORIA DE CÓDIGO (A CORREÇÃO) ---
        // 1. Tenta remover qualquer botão antigo que possa ter ficado para trás.
        // Se não houver nenhum, a API pode dar um erro, mas podemos ignorá-lo.
        try {
            await call('placement.unbind', {
                PLACEMENT: 'CRM_COMPANY_DETAIL_TOOLBAR',
                HANDLER: handlerUrl
            });
        } catch (unbindError) {
            // Ignora o erro se o botão não existia. Isso é esperado.
            console.log("Tentativa de unbind (limpeza) concluída. Continuando a instalação...");
        }
        
        // 2. Agora, cria o botão com segurança, sabendo que não há duplicatas.
        await call('placement.bind', {
            PLACEMENT: 'CRM_COMPANY_DETAIL_TOOLBAR',
            HANDLER: handlerUrl,
            TITLE: 'Gerar Autorização PDF',
            DESCRIPTION: 'Gera PDF de autorização de vendas'
        });
        // --- FIM DA MELHORIA ---

        res.send('<head><script>top.BX.closeApplication();</script></head><body>Instalado com sucesso!</body>');

    } catch (error) {
        console.error('ERRO DURANTE A EXECUCAO DA INSTALACAO:', error); 
        res.status(500).send('Erro durante a instalacao: ' + error.message);
    }
}
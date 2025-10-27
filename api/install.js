import { saveTokens, call } from '../utils/b24.js';

// Este é o manipulador da serverless function
export default async function handler(req, res) {
    
    // O Bitrix24 envia os dados no corpo (body) da requisição
    const { AUTH_ID, REFRESH_ID, domain } = req.body || req.query; // Aceita GET ou POST

    if (!AUTH_ID || !domain) {
        return res.status(400).send("Erro: Parametros de instalacao nao recebidos.");
    }

    try {
        // 1. Salva os tokens pela primeira vez no Vercel KV
        const tokens = {
            access_token: AUTH_ID,
            refresh_token: REFRESH_ID,
            domain: domain
        };
        await saveTokens(tokens);

        // 2. Registra o nosso botão (Placement)
        const handlerUrl = `https://${req.headers.host}/api/handler`;
        
        await call('placement.bind', {
            PLACEMENT: 'CRM_COMPANY_DETAIL_TOOLBAR',
            HANDLER: handlerUrl, // A URL do nosso script de formulário
            TITLE: 'Gerar Autorização PDF',
            DESCRIPTION: 'Gera PDF de autorização de vendas'
        });

        // 3. Se tudo deu certo, fecha a janela de instalação
        res.send('<head><script>top.BX.closeApplication();</script></head><body>Instalado com sucesso!</body>');

    } catch (error) {
        console.error(error); // Loga o erro no console da Vercel
        res.status(500).send('Erro durante a instalacao: ' + error.message);
    }
}
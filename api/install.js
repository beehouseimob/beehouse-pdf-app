import { saveTokens, call } from '../utils/b24.js';

export default async function handler(req, res) {
    
    // Combina os parâmetros de GET (req.query) e POST (req.body)
    const params = { ...req.query, ...req.body };

    // --- A CORREÇÃO ESTÁ AQUI ---
    // Pegamos os valores com os nomes corretos que vimos no log
    const AUTH_ID = params.AUTH_ID;
    const REFRESH_ID = params.REFRESH_ID;
    const domain = params.DOMAIN; // O Bitrix24 envia "DOMAIN" em maiúsculas
    // --- FIM DA CORREÇÃO ---

    if (!AUTH_ID || !domain) {
        // Esta verificação agora deve passar, mas a mantemos por segurança
        const errorMsg = "Erro: Parametros de instalacao (AUTH_ID, DOMAIN) nao recebidos.";
        console.error(errorMsg, params); // Loga os parâmetros se falhar
        return res.status(400).send(errorMsg);
    }

    try {
        // 1. Salva os tokens pela primeira vez no Vercel KV
        const tokens = {
            access_token: AUTH_ID,
            refresh_token: REFRESH_ID,
            domain: domain // Usamos a variável 'domain' (minúscula) que criamos
        };
        await saveTokens(tokens);

        // 2. Registra o nosso botão (Placement)
        const handlerUrl = `https://${req.headers.host}/api/handler`;
        
        await call('placement.bind', {
            PLACEMENT: 'CRM_COMPANY_DETAIL_TOOLBAR',
            HANDLER: handlerUrl,
            TITLE: 'Gerar Autorização PDF',
            DESCRIPTION: 'Gera PDF de autorização de vendas'
        });

        // 3. Se tudo deu certo, fecha a janela de instalação
        res.send('<head><script>top.BX.closeApplication();</script></head><body>Instalado com sucesso!</body>');

    } catch (error) {
        console.error('ERRO DURANTE A EXECUCAO DA INSTALACAO:', error); 
        res.status(500).send('Erro durante a instalacao: ' + error.message);
    }
}
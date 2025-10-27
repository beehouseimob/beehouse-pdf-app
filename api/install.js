import { saveTokens, call } from '../utils/b24.js';

export default async function handler(req, res) {
    
    // --- MÓDULO DE DEPURAÇÃO ---
    console.log('--- INICIO DA REQUISICAO DE INSTALACAO ---');
    console.log('METODO HTTP:', req.method);
    console.log('HEADERS:', JSON.stringify(req.headers, null, 2));
    console.log('REQ.QUERY (GET):', JSON.stringify(req.query, null, 2));
    console.log('REQ.BODY (POST):', JSON.stringify(req.body, null, 2));
    console.log('--- FIM DA DEPURAÇÃO ---');
    // ----------------------------

    // Combina os parâmetros de GET (req.query) e POST (req.body)
    const params = { ...req.query, ...req.body };
    const { AUTH_ID, REFRESH_ID, domain } = params;

    if (!AUTH_ID || !domain) {
        // Se não encontrar os parâmetros, falha e mostra o log
        const errorMsg = "Erro: Parametros de instalacao (AUTH_ID, domain) nao recebidos.";
        console.error(errorMsg);
        return res.status(400).send(errorMsg);
    }

    try {
        console.log('Parâmetros recebidos com sucesso. Tentando salvar tokens...');
        // 1. Salva os tokens pela primeira vez no Vercel KV
        const tokens = {
            access_token: AUTH_ID,
            refresh_token: REFRESH_ID,
            domain: domain
        };
        await saveTokens(tokens);
        console.log('Tokens salvos.');

        // 2. Registra o nosso botão (Placement)
        const handlerUrl = `https://${req.headers.host}/api/handler`;
        console.log('Registrando botão no handler:', handlerUrl);
        
        await call('placement.bind', {
            PLACEMENT: 'CRM_COMPANY_DETAIL_TOOLBAR',
            HANDLER: handlerUrl,
            TITLE: 'Gerar Autorização PDF',
            DESCRIPTION: 'Gera PDF de autorização de vendas'
        });
        console.log('Botão registrado com sucesso!');

        // 3. Se tudo deu certo, fecha a janela de instalação
        res.send('<head><script>top.BX.closeApplication();</script></head><body>Instalado com sucesso!</body>');

    } catch (error) {
        console.error('ERRO DURANTE A EXECUCAO DA INSTALACAO:', error); 
        res.status(500).send('Erro durante a instalacao: ' + error.message);
    }
}
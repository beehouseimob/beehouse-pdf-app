import { saveTokens, call } from '../utils/b24.js';

export default async function handler(req, res) {
    
    // --- MUDANÇA IMPORTANTE AQUI ---
    // Combina os parâmetros de GET (req.query) e POST (req.body)
    // A instalação real (clique em Instalar) vem por GET (req.query)
    // A validação (ao Salvar) vem por POST (req.body vazio)
    const params = { ...req.query, ...req.body };
    const { AUTH_ID, REFRESH_ID, domain } = params;
    // --- FIM DA MUDANÇA ---

    if (!AUTH_ID || !domain) {
        // Se for a validação (POST sem dados), ela vai falhar aqui. 
        // Isso é normal e esperado.
        return res.status(400).send("Erro: Parametros de instalacao (AUTH_ID, domain) nao recebidos.");
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
        // O helper 'call' vai usar os tokens que acabámos de salvar
        const handlerUrl = `https://${req.headers.host}/api/handler`;
        
        await call('placement.bind', {
            PLACEMENT: 'CRM_COMPANY_DETAIL_TOOLBAR', // O local: Barra de ferramentas da Empresa
            HANDLER: handlerUrl, // O nosso script do formulário
            TITLE: 'Gerar Autorização PDF',
            DESCRIPTION: 'Gera PDF de autorização de vendas'
        });

        // 3. Se tudo deu certo, fecha a janela de instalação
        res.send('<head><script>top.BX.closeApplication();</script></head><body>Instalado com sucesso!</body>');

    } catch (error) {
        // Se a instalação real falhar, veremos o log de erro
        console.error('ERRO NA INSTALACAO REAL:', error); 
        res.status(500).send('Erro durante a instalacao: ' + error.message);
    }
}
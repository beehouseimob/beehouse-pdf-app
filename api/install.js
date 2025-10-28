import { saveTokens, call } from '../utils/b24.js';
// Importa a lógica do nosso outro arquivo!
// Este caminho assume que 'install.js' e 'handler.js' estão na mesma pasta '/api'
import handler from './handler.js'; 

export default async function (req, res) {
    
    // Combina todos os parâmetros de GET e POST
    const params = { ...req.query, ...req.body };

    // --- ROTEADOR INTELIGENTE ---
    // VERIFICA SE É UM CLIQUE DE BOTÃO (PLACEMENT)
    // O Bitrix24 envia 'PLACEMENT_OPTIONS' quando um botão é clicado
    if (params.PLACEMENT_OPTIONS) {
        console.log('DETECTADO CLIQUE DE BOTÃO. Redirecionando para o handler...');
        // Se for um clique de botão, executa a lógica do handler
        // e passa 'req' e 'res' para ele.
        return handler(req, res);
    }

    // --- LÓGICA DE INSTALAÇÃO ---
    // Se não for um clique de botão, deve ser uma instalação.
    // Procura por AUTH_ID e DOMAIN.
    console.log('NÃO É CLIQUE DE BOTÃO. Tentando instalar...');
    const AUTH_ID = params.AUTH_ID;
    const REFRESH_ID = params.REFRESH_ID;
    const domain = params.DOMAIN;

    if (!AUTH_ID || !domain) {
        const errorMsg = "Erro: Parametros de instalacao (AUTH_ID, DOMAIN) nao recebidos.";
        console.error(errorMsg, params); 
        return res.status(400).send(errorMsg);
    }

    // Se chegou aqui, é uma instalação válida.
    try {
        console.log('Instalação válida. Salvando tokens...');
        const tokens = {
            access_token: AUTH_ID,
            refresh_token: REFRESH_ID,
            domain: domain 
        };
        await saveTokens(tokens);
        console.log('Tokens salvos.');

        // *** MUDANÇA CRÍTICA ***
        // Agora, o HANDLER do botão é o PRÓPRIO /api/install.
        // Quando o botão for clicado, ele chamará este mesmo script.
        // O roteador no topo do script vai pegá-lo.
        const selfUrl = `https://${req.headers.host}/api/install`;
        
        console.log('Limpando botões antigos...');
        try {
            await call('placement.unbind', {
                PLACEMENT: 'CRM_COMPANY_DETAIL_TOOLBAR',
                HANDLER: selfUrl
            });
        } catch (unbindError) {
            console.log("Limpeza (unbind) concluída.");
        }
        
        console.log('Registrando novo botão apontando para:', selfUrl);
        await call('placement.bind', {
            PLACEMENT: 'CRM_COMPANY_DETAIL_TOOLBAR',
            HANDLER: selfUrl, // Aponta para si mesmo!
            TITLE: 'Gerar Autorização PDF',
            DESCRIPTION: 'Gera PDF de autorização de vendas'
        });
        console.log('Botão registrado com sucesso.');

        res.send('<head><script>top.BX.closeApplication();</script></head><body>Instalado com sucesso!</body>');

    } catch (error) {
        console.error('ERRO DURANTE A EXECUCAO DA INSTALACAO:', error); 
        res.status(500).send('Erro durante a instalacao: ' + error.message);
    }
}
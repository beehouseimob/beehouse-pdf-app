// /api/install.js
import axios from 'axios';
// Importa as funções corretas do b24.js
import { saveTokens, call } from '../utils/b24.js';

// Pega credenciais do ambiente Vercel
const CLIENT_ID = process.env.B24_CLIENT_ID;
const CLIENT_SECRET = process.env.B24_CLIENT_SECRET;

export default async function handler(req, res) {
    console.log('[Install] Requisição recebida...');
    console.log('[Install] Query Params:', req.query);
    console.log('[Install] Body Params:', req.body);
 
    // Unifica parâmetros de query e body, dando prioridade ao body.
    const params = { ...req.query, ...req.body }; 
    const domain = params.domain || params.DOMAIN;
    const memberId = params.member_id || params.MEMBER_ID;
 
    // --- PRIORIDADE 1: Fluxo de App Local (AUTH_ID no body) ---
    if (params.AUTH_ID && memberId && domain) {
        console.log('[Install] Detectado fluxo de App Local (AUTH_ID e member_id presentes).');
        try {
            const tokens = {
                access_token: params.AUTH_ID,
                refresh_token: params.REFRESH_ID,
                expires_in: params.AUTH_EXPIRES ? Math.floor(Date.now() / 1000) + parseInt(params.AUTH_EXPIRES, 10) : Math.floor(Date.now() / 1000) + 3600,
                domain: domain,
                member_id: memberId // Essencial para salvar no KV
            };

            if (!tokens.access_token) {
                throw new Error('access_token ausente no fluxo de App Local.');
            }

            console.log('[Install Local App] Salvando tokens para member_id:', tokens.member_id);
            await saveTokens(tokens); // Salva usando member_id como chave
            console.log('[Install Local App] Tokens salvos com sucesso.');

            // Registra/atualiza o botão (placement), apontando para si mesmo
            const handlerUrl = `https://${req.headers.host}/api/install`;
            await registerPlacement(handlerUrl, tokens); // Passa os tokens para autenticar a chamada

            console.log('[Install Local App] Instalação/Atualização concluída.');
            res.setHeader('Content-Type', 'text/html');
            res.send('<head><script>top.BX.closeApplication();</script></head><body>Instalado/Atualizado com sucesso (App Local)!</body>');
            return;

        } catch (error) {
            console.error('[Install Local App] ERRO DURANTE O FLUXO:', error.response?.data || error.details || error.message || error);
            const errorMessage = error.details?.error_description || error.message || 'Erro desconhecido';
            res.status(500).send(`Erro durante a instalação (App Local): ${errorMessage}`);
            return;
        }
    }

    // --- PRIORIDADE 2: Fluxo OAuth padrão (code na query) ---
    else if (params.code && params.domain && params.member_id && !req.body.AUTH_ID) {
        console.log('[Install] Detectado fluxo OAuth (parâmetro code presente na query).');
        try {
            const tokenUrl = `https://${params.domain}/oauth/token/`;
            const tokenParams = {
                grant_type: 'authorization_code',
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code: params.code
            };

            console.log(`[Install OAuth] Solicitando tokens de: ${tokenUrl}`);
            const response = await axios.post(tokenUrl, null, { params: tokenParams });
            console.log('[Install OAuth] Tokens recebidos:', response.data);

            const tokenData = response.data;
            const tokens = {
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_in: Math.floor(Date.now() / 1000) + tokenData.expires_in,
                domain: tokenData.domain,
                member_id: tokenData.member_id
            };

            if (!tokens.access_token || !tokens.refresh_token || !tokens.domain || !tokens.member_id) {
                throw new Error('Falha ao receber dados de token válidos do Bitrix24 via OAuth.');
            }

            await saveTokens(tokens); // Salva usando member_id como chave
            console.log('[Install OAuth] Tokens salvos com sucesso para member_id:', tokens.member_id);

            const handlerUrl = `https://${req.headers.host}/api/install`; // Aponta para si mesmo
            await registerPlacement(handlerUrl, tokens); // Passa os tokens para autenticar a chamada

            console.log('[Install OAuth] Instalação concluída.');
            res.setHeader('Content-Type', 'text/html');
            res.send('<head><script>top.BX.closeApplication();</script></head><body>Instalado com sucesso (OAuth)! Feche esta janela.</body>');
            return;

        } catch (error) {
            console.error('[Install OAuth] ERRO DURANTE O FLUXO OAUTH:', error.response?.data || error.message || error);
            const errorMessage = error.response?.data?.error_description || error.message || 'Erro desconhecido';
            res.status(500).send(`Erro durante a instalação (OAuth): ${errorMessage}`);
            return;
        }
    }

    // --- PRIORIDADE 3: Chamada inicial de verificação (APP_SID na query) ---
    else if (req.query.APP_SID && !params.AUTH_ID && !params.code) {
        console.log('[Install] Detectada chamada inicial de verificação (APP_SID presente, sem code/AUTH_ID). Respondendo 200 OK.');
        res.status(200).send('Endpoint de instalação acessível.');
        return;
    }

    // --- FLUXO NÃO RECONHECIDO ---
    else {
        console.warn('[Install] Parâmetros não correspondem a App Local, OAuth nem chamada inicial. Respondendo 200 OK por segurança.', params);
        res.status(200).send('Recebido. Tipo de requisição não processada.');
        return;
    }
}

// Função auxiliar para registrar/atualizar o placement
async function registerPlacement(handlerUrl, tokens) {
    if (!tokens || !tokens.access_token) {
        console.error('[Install Register] Tentativa de registrar placement sem tokens válidos.');
        throw new Error('Tokens inválidos ou ausentes para registrar o placement.');
    }
    console.log(`[Install Register] Registrando/Atualizando placement para: ${handlerUrl}`);

    console.log('[Install Register] Limpando botões antigos (se existirem)...');
    try {
        // Passa os tokens como terceiro argumento para 'call'
        await call('placement.unbind', {
            PLACEMENT: 'CRM_COMPANY_DETAIL_TOOLBAR',
            HANDLER: handlerUrl
        }, tokens); 
        console.log('[Install Register] Unbind (limpeza) concluído.');
    } catch (unbindError) {
        const errorCode = unbindError.details?.code || unbindError.details?.error;
        if (errorCode !== 'PLACEMENT_HANDLER_NOT_FOUND' && errorCode !== 'ERROR_PLACEMENT_HANDLER_NOT_FOUND') {
           console.warn("[Install Register] Erro durante o unbind (ignorado se for 'NOT_FOUND'):", unbindError.message);
        } else {
           console.log("[Install Register] Handler antigo não encontrado.");
        }
    }

    console.log('[Install Register] Registrando novo botão...');
    // Passa os tokens como terceiro argumento para 'call'
    await call('placement.bind', {
        PLACEMENT: 'CRM_COMPANY_DETAIL_TOOLBAR',
        HANDLER: handlerUrl,
        TITLE: 'Gerar Autorização PDF',
        DESCRIPTION: 'Gera PDF de autorização de vendas'
    }, tokens); 
    console.log('[Install Register] Botão registrado com sucesso.');
}

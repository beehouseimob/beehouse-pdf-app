// /api/install.js
import axios from 'axios';
// Certifique-se que b24.js exporta 'saveTokens' e 'call'
import { saveTokens, call } from '../utils/b24.js';

// Pega credenciais do ambiente Vercel (necessário para fluxo OAuth fallback)
const CLIENT_ID = process.env.B24_CLIENT_ID;
const CLIENT_SECRET = process.env.B24_CLIENT_SECRET;

export default async function handler(req, res) {
    console.log('[Install] Requisição recebida...');
    console.log('[Install] Query Params:', req.query);
    console.log('[Install] Body Params:', req.body);

    // Combina query e body, dando preferência ao body para tokens de App Local
    const params = { ...req.query, ...req.body };

    // --- PRIORIDADE 1: Fluxo de App Local (AUTH_ID no body) ---
    // Verifica os parâmetros essenciais: AUTH_ID, member_id, DOMAIN (ou domain)
    const domain = params.DOMAIN || params.domain; // Aceita ambos os casings
    if (params.AUTH_ID && params.member_id && domain) {
        console.log('[Install] Detectado fluxo de App Local (AUTH_ID presente).');
        try {
            const tokens = {
                access_token: params.AUTH_ID,
                refresh_token: params.REFRESH_ID, // Pode ser indefinido em algumas chamadas
                // Calcula timestamp de expiração (agora + AUTH_EXPIRES segundos)
                expires_in: params.AUTH_EXPIRES ? Math.floor(Date.now() / 1000) + parseInt(params.AUTH_EXPIRES, 10) : Math.floor(Date.now() / 1000) + 3600, // Usa 1 hora como padrão se AUTH_EXPIRES faltar
                domain: domain,
                member_id: params.member_id // Crucial para a chave do KV
            };

            // Validação mínima
            if (!tokens.access_token || !tokens.domain || !tokens.member_id) {
                 throw new Error('Dados essenciais (access_token, domain, member_id) ausentes para App Local.');
            }

            console.log('[Install Local App] Salvando tokens para member_id:', tokens.member_id);
            await saveTokens(tokens);
            console.log('[Install Local App] Tokens salvos com sucesso.');

            // Registra/atualiza o botão (placement)
            // A URL do handler deve ser /api/handler
            const handlerUrl = `https://${req.headers.host}/api/handler`;
            await registerPlacement(handlerUrl, tokens); // Usa os tokens recebidos

            // Responde ao Bitrix24 para fechar a janela/confirmar
            console.log('[Install Local App] Instalação/Atualização concluída. Enviando resposta.');
            res.setHeader('Content-Type', 'text/html');
            res.send('<head><script>top.BX.closeApplication();</script></head><body>Instalado/Atualizado com sucesso (App Local)!</body>');
            return; // Finaliza

        } catch (error) {
            console.error('[Install Local App] ERRO DURANTE O FLUXO:', error.response?.data || error.details || error.message || error);
            const errorMessage = error.details?.error_description || error.message || 'Erro desconhecido';
            res.status(500).send(`Erro durante a instalação (App Local): ${errorMessage}`);
            return; // Finaliza
        }
    }

    // --- PRIORIDADE 2: Fluxo OAuth padrão (code na query) ---
    // Verifica se os parâmetros OAuth estão na query E se AUTH_ID NÃO veio no body
    else if (params.code && params.domain && params.member_id && !req.body.AUTH_ID) {
        console.log('[Install] Detectado fluxo OAuth (parâmetro code presente na query).');
        try {
            // 1. Troca o código (code) por tokens
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

            // 2. Salva os tokens
            await saveTokens(tokens);
            console.log('[Install OAuth] Tokens salvos com sucesso para member_id:', tokens.member_id);

            // 3. Registra o botão
            const handlerUrl = `https://${req.headers.host}/api/handler`;
            await registerPlacement(handlerUrl, tokens);

            // 4. Responde para fechar a janela
            console.log('[Install OAuth] Instalação concluída. Enviando resposta.');
            res.setHeader('Content-Type', 'text/html');
            res.send('<head><script>top.BX.closeApplication();</script></head><body>Instalado com sucesso (OAuth)! Feche esta janela.</body>');
            return; // Finaliza

        } catch (error) {
            console.error('[Install OAuth] ERRO DURANTE O FLUXO OAUTH:', error.response?.data || error.message || error);
            const errorMessage = error.response?.data?.error_description || error.message || 'Erro desconhecido';
            res.status(500).send(`Erro durante a instalação (OAuth): ${errorMessage}`);
            return; // Finaliza
        }
    }

    // --- PRIORIDADE 3: Chamada inicial de verificação (APP_SID na query, sem code/AUTH_ID) ---
    // Verifica se APP_SID está na query e os outros tokens NÃO estão presentes
    else if (req.query.APP_SID && !params.AUTH_ID && !params.code) {
        console.log('[Install] Detectada chamada inicial de verificação (APP_SID presente, sem code/AUTH_ID). Respondendo 200 OK.');
        res.status(200).send('Endpoint de instalação acessível.');
        return; // Finaliza
    }

    // --- FLUXO NÃO RECONHECIDO ---
    else {
        const errorMsg = 'Erro: Parâmetros de instalação não reconhecidos ou fluxo inválido.';
        console.error(errorMsg, params);
        console.warn('[Install] Parâmetros não correspondem a App Local, OAuth nem chamada inicial. Respondendo 200 OK por segurança.');
        res.status(200).send('Recebido. Tipo de requisição não processada especificamente.');
        return; // Finaliza
    }
}

// Função auxiliar para registrar/atualizar o placement (sem alterações)
async function registerPlacement(handlerUrl, tokens) {
    // Verifica se 'tokens' é válido
    if (!tokens || !tokens.access_token) {
        console.error('[Install Register] Tentativa de registrar placement sem tokens válidos.');
        throw new Error('Tokens inválidos ou ausentes para registrar o placement.');
    }
    console.log('[Install Register] Registrando/Atualizando placement...');
    console.log('[Install Register] Handler URL:', handlerUrl);
    console.log('[Install Register] Usando token (início):', tokens.access_token.substring(0, 5) + '...');

    console.log('[Install Register] Limpando botões antigos (se existirem)...');
    try {
        await call('placement.unbind', {
            PLACEMENT: 'CRM_COMPANY_DETAIL_TOOLBAR',
            HANDLER: handlerUrl
        }, tokens); // Passa tokens para autenticar
        console.log('[Install Register] Unbind (limpeza) concluído ou não necessário.');
    } catch (unbindError) {
        const errorCode = unbindError.details?.code || unbindError.details?.error;
        // Ignora apenas o erro específico de não encontrar o handler antigo
        if (errorCode !== 'PLACEMENT_HANDLER_NOT_FOUND' && errorCode !== 'ERROR_PLACEMENT_HANDLER_NOT_FOUND') {
           console.warn("[Install Register] Erro durante o unbind (pode ser ignorado se for 'NOT_FOUND'):", unbindError.message, unbindError.details);
        } else {
           console.log("[Install Register] Handler antigo não encontrado ou já removido, continuando...");
        }
    }

    console.log('[Install Register] Registrando novo botão...');
    await call('placement.bind', {
        PLACEMENT: 'CRM_COMPANY_DETAIL_TOOLBAR', // Local
        HANDLER: handlerUrl, // URL a ser chamada
        TITLE: 'Gerar Autorização PDF', // Texto do botão
        DESCRIPTION: 'Gera PDF de autorização de vendas' // Descrição
    }, tokens); // Passa tokens para autenticar
    console.log('[Install Register] Botão registrado com sucesso.');
}
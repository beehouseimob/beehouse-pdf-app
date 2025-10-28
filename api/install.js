// /api/install.js
import axios from 'axios';
import { saveTokens, call } from '../utils/b24.js'; // Funções do seu b24.js

// Pega credenciais do ambiente Vercel
const CLIENT_ID = process.env.B24_CLIENT_ID;
const CLIENT_SECRET = process.env.B24_CLIENT_SECRET;

export default async function handler(req, res) {
    console.log('[Install] Iniciando processo de instalação...');
    console.log('[Install] Query Params recebidos:', req.query);

    // Verifica se temos os parâmetros OBRIGATÓRIOS do fluxo OAuth2
    if (!req.query.code || !req.query.domain || !req.query.member_id) {
        const errorMsg = 'Erro: Parâmetros de instalação OAuth (code, domain, member_id) não recebidos ou incompletos.';
        console.error(errorMsg, req.query);
        return res.status(400).send(errorMsg);
    }

    try {
        // 1. Troca o código de autorização (code) por tokens de acesso/atualização
        const tokenUrl = `https://${req.query.domain}/oauth/token/`;
        const tokenParams = {
            grant_type: 'authorization_code',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code: req.query.code
        };

        console.log(`[Install] Solicitando tokens de: ${tokenUrl}`);
        // Usa POST para /oauth/token/, passando params como URLSearchParams ou no corpo x-www-form-urlencoded
        // Axios pode fazer isso automaticamente se passado como 'data' e com header correto,
        // mas usar params com POST também costuma funcionar com Bitrix.
        const response = await axios.post(tokenUrl, null, { params: tokenParams });
        console.log('[Install] Tokens recebidos:', response.data);

        // Estrutura esperada da resposta do Bitrix24
        const tokenData = response.data;
        const tokens = {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            // Calcula o timestamp UNIX absoluto de expiração
            expires_in: Math.floor(Date.now() / 1000) + tokenData.expires_in,
            domain: tokenData.domain,
            member_id: tokenData.member_id // Essencial para salvar/recuperar tokens corretamente
        };

        // Validação básica
        if (!tokens.access_token || !tokens.refresh_token || !tokens.domain || !tokens.member_id) {
            console.error('[Install] Dados de token inválidos recebidos:', tokenData);
            throw new Error('Falha ao receber dados de token válidos do Bitrix24.');
        }

        // 2. Salva os tokens usando a função do b24.js (que usa Vercel KV com member_id como chave)
        await saveTokens(tokens);
        console.log('[Install] Tokens salvos com sucesso para member_id:', tokens.member_id);

        // 3. Registra (ou atualiza) o botão (placement)
        // A URL do handler do botão deve ser o endpoint /api/handler
        const handlerUrl = `https://${req.headers.host}/api/handler`; // *** Aponta para /api/handler ***

        await registerPlacement(handlerUrl, tokens); // Passa a URL e os tokens para autenticar

        // 4. Responde ao Bitrix24 para fechar a janela
        console.log('[Install] Instalação concluída. Enviando resposta para fechar janela.');
        res.setHeader('Content-Type', 'text/html');
        res.send('<head><script>top.BX.closeApplication();</script></head><body>Instalado com sucesso! Feche esta janela.</body>');

    } catch (error) {
        console.error('[Install] ERRO DURANTE A INSTALAÇÃO:', error.response?.data || error.message || error);
        const errorMessage = error.response?.data?.error_description || error.message || 'Erro desconhecido';
        res.status(500).send(`Erro durante a instalação: ${errorMessage}`);
    }
}

// Função auxiliar para registrar/atualizar o placement
async function registerPlacement(handlerUrl, tokens) {
    console.log('[Install Register] Limpando botões antigos (se existirem) que apontam para:', handlerUrl);
    try {
        // Tenta remover qualquer botão anterior no mesmo local apontando para a mesma URL
        await call('placement.unbind', {
            PLACEMENT: 'CRM_COMPANY_DETAIL_TOOLBAR',
            HANDLER: handlerUrl // URL que o botão vai chamar
        }, tokens); // Usa os tokens obtidos para autenticar esta chamada
        console.log('[Install Register] Unbind (limpeza) concluído ou não necessário.');
    } catch (unbindError) {
        // É comum dar erro 'PLACEMENT_HANDLER_NOT_FOUND' se o handler não existia antes. Ignora apenas esse.
        if (unbindError.details?.code !== 'PLACEMENT_HANDLER_NOT_FOUND' && unbindError.details?.error !== 'PLACEMENT_HANDLER_NOT_FOUND') {
           console.warn("[Install Register] Erro durante o unbind (pode ser ignorado se for 'NOT_FOUND'):", unbindError.message, unbindError.details);
        } else {
           console.log("[Install Register] Handler antigo não encontrado ou já removido, continuando...");
        }
    }

    console.log('[Install Register] Registrando novo botão apontando para:', handlerUrl);
    // Registra o botão
    await call('placement.bind', {
        PLACEMENT: 'CRM_COMPANY_DETAIL_TOOLBAR', // Local onde o botão aparece
        HANDLER: handlerUrl, // URL que será chamada ao clicar
        TITLE: 'Gerar Autorização PDF', // Texto do botão
        DESCRIPTION: 'Gera PDF de autorização de vendas' // Descrição (opcional)
    }, tokens); // Usa os tokens obtidos para autenticar esta chamada
    console.log('[Install Register] Botão registrado com sucesso.');
}
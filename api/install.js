// /api/install.js
import axios from 'axios';
import { saveTokens, call } from '../utils/b24.js'; // Funções do seu b24.js

// Pega credenciais do ambiente Vercel
const CLIENT_ID = process.env.B24_CLIENT_ID;
const CLIENT_SECRET = process.env.B24_CLIENT_SECRET;

export default async function handler(req, res) {
    console.log('[Install] Requisição recebida...');
    console.log('[Install] Query Params:', req.query);
    console.log('[Install] Body Params:', req.body); // Adiciona log do body também

    // Combina query e body para facilitar acesso, priorizando query
    const params = { ...req.body, ...req.query };

    // *** INÍCIO DA VERIFICAÇÃO DO TIPO DE REQUISIÇÃO ***

    // CENÁRIO 1: É o redirecionamento OAuth (contém 'code')
    if (params.code && params.domain && params.member_id) {
        console.log('[Install] Detectado fluxo OAuth (parâmetro code presente).');
        try {
            // 1. Troca o código de autorização (code) por tokens
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
                member_id: tokenData.member_id // Essencial
            };

            if (!tokens.access_token || !tokens.refresh_token || !tokens.domain || !tokens.member_id) {
                console.error('[Install OAuth] Dados de token inválidos recebidos:', tokenData);
                throw new Error('Falha ao receber dados de token válidos do Bitrix24.');
            }

            // 2. Salva os tokens
            await saveTokens(tokens);
            console.log('[Install OAuth] Tokens salvos com sucesso para member_id:', tokens.member_id);

            // 3. Registra (ou atualiza) o botão (placement)
            const handlerUrl = `https://${req.headers.host}/api/handler`;
            await registerPlacement(handlerUrl, tokens);

            // 4. Responde ao Bitrix24 para fechar a janela
            console.log('[Install OAuth] Instalação concluída. Enviando resposta para fechar janela.');
            res.setHeader('Content-Type', 'text/html');
            res.send('<head><script>top.BX.closeApplication();</script></head><body>Instalado com sucesso! Feche esta janela.</body>');
            return; // Termina a execução aqui

        } catch (error) {
            console.error('[Install OAuth] ERRO DURANTE O FLUXO OAUTH:', error.response?.data || error.message || error);
            const errorMessage = error.response?.data?.error_description || error.message || 'Erro desconhecido';
            res.status(500).send(`Erro durante a instalação (OAuth): ${errorMessage}`);
            return; // Termina a execução aqui
        }
    }

    // CENÁRIO 2: É a chamada inicial de instalação/verificação (contém 'APP_SID' ou similar, mas NÃO 'code')
    // Ou pode ser uma chamada de atualização ou desinstalação que não trataremos especificamente aqui.
    else if (params.DOMAIN && params.APP_SID) { // Verifica parâmetros típicos da chamada inicial
        console.log('[Install] Detectada chamada inicial de instalação/verificação (APP_SID presente, sem code).');
        // Apenas responde 200 OK para indicar que o endpoint está acessível.
        // O Bitrix24 então prosseguirá para a tela de permissões e depois fará o redirect OAuth (CENÁRIO 1).
        res.status(200).send('Endpoint de instalação acessível. Aguardando autorização OAuth.');
        return; // Termina a execução aqui
    }

    // CENÁRIO 3: Parâmetros inesperados ou fluxo não reconhecido
    else {
        const errorMsg = 'Erro: Parâmetros de instalação não reconhecidos ou fluxo inválido.';
        console.error(errorMsg, params);
        // Retorna um erro, mas talvez um 200 OK seja mais seguro para não quebrar fluxos desconhecidos do Bitrix
        // return res.status(400).send(errorMsg);
        console.warn('[Install] Parâmetros não correspondem a OAuth nem à chamada inicial esperada. Respondendo 200 OK por segurança.');
        res.status(200).send('Recebido. Tipo de requisição não processada especificamente.');
        return; // Termina a execução aqui
    }
}

// Função auxiliar para registrar/atualizar o placement (mantida igual)
async function registerPlacement(handlerUrl, tokens) {
    console.log('[Install Register] Limpando botões antigos (se existirem) que apontam para:', handlerUrl);
    try {
        await call('placement.unbind', {
            PLACEMENT: 'CRM_COMPANY_DETAIL_TOOLBAR',
            HANDLER: handlerUrl
        }, tokens);
        console.log('[Install Register] Unbind (limpeza) concluído ou não necessário.');
    } catch (unbindError) {
        if (unbindError.details?.code !== 'PLACEMENT_HANDLER_NOT_FOUND' && unbindError.details?.error !== 'PLACEMENT_HANDLER_NOT_FOUND') {
           console.warn("[Install Register] Erro durante o unbind:", unbindError.message, unbindError.details);
        } else {
           console.log("[Install Register] Handler antigo não encontrado ou já removido, continuando...");
        }
    }

    console.log('[Install Register] Registrando novo botão apontando para:', handlerUrl);
    await call('placement.bind', {
        PLACEMENT: 'CRM_COMPANY_DETAIL_TOOLBAR',
        HANDLER: handlerUrl,
        TITLE: 'Gerar Autorização PDF',
        DESCRIPTION: 'Gera PDF de autorização de vendas'
    }, tokens);
    console.log('[Install Register] Botão registrado com sucesso.');
}
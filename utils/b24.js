import { kv } from '@vercel/kv';
import axios from 'axios';

// Pega as chaves do ambiente da Vercel
const CLIENT_ID = process.env.B24_CLIENT_ID;
const CLIENT_SECRET = process.env.B24_CLIENT_SECRET;

// Salva os tokens no Vercel KV
export async function saveTokens(tokens) {
    await kv.set('b24_tokens', tokens);
}

// Carrega os tokens do Vercel KV
export async function getTokens() {
    return await kv.get('b24_tokens');
}

/**
 * Faz uma chamada à API REST, atualizando o token se expirar
 * @param {string} method - Método da API (ex: 'crm.company.get')
 * @param {object} params - Parâmetros da chamada
 * @returns {Promise<object>} - Resultado da API
 */
export async function call(method, params = {}) {
    let tokens = await getTokens();
    if (!tokens) {
        throw new Error('Tokens nao encontrados. App nao esta instalado?');
    }

    const { access_token, refresh_token, domain } = tokens;
    const url = `https://${domain}/rest/${method}.json`;

    try {
        // 1. Tenta a chamada com o access_token atual
        const response = await axios.post(url, { ...params, auth: access_token });
        return response.data;

    } catch (error) {
        // 2. Verifica se o token expirou
        
        // --- A CORREÇÃO ESTÁ AQUI ---
        // Vamos verificar a mensagem de erro em minúsculas
        const errorType = (error.response && error.response.data && error.response.data.error)
            ? error.response.data.error.toLowerCase()
            : '';
        
        if (errorType === 'expired_token') {
        // --- FIM DA CORREÇÃO ---

            console.log('Token expirado. Tentando renovar...');
            
            // 3. Se expirou, pede um novo token
            const refreshUrl = `https://oauth.bitrix.info/oauth/token/`;
            const refreshResponse = await axios.post(refreshUrl, null, {
                params: {
                    grant_type: 'refresh_token',
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    refresh_token: refresh_token
                }
            });

            const newTokens = {
                access_token: refreshResponse.data.access_token,
                refresh_token: refreshResponse.data.refresh_token,
                domain: refreshResponse.data.domain
            };

            // 4. Salva os NOVOS tokens no Vercel KV
            await saveTokens(newTokens);
            console.log('Token renovado e salvo com sucesso.');
            
            // 5. Tenta a chamada da API novamente com o NOVO token
            const retryResponse = await axios.post(url, { ...params, auth: newTokens.access_token });
            return retryResponse.data;

        } else {
            // Foi outro tipo de erro
            console.error('Erro na chamada da API:', error.response ? error.response.data : error.message);
            throw new Error('Erro na chamada da API: ' + (error.response ? error.response.data.error_description : error.message));
        }
    }
}
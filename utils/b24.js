import { kv } from '@vercel/kv';
import axios from 'axios';
// Precisamos disto para formatar os dados corretamente
import { URLSearchParams } from 'url';

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
    const url = `https://${domain}/rest/${method}`; // URL correta (sem .json)

    // --- A SOLUÇÃO DEFINITIVA À PROVA DE FALHAS ---
    // O Bitrix24 espera dados no formato 'application/x-www-form-urlencoded'.
    // Vamos usar POST para TUDO e formatar o corpo da requisição
    // usando URLSearchParams. Isso força o axios a usar o Content-Type correto.
    
    const makeRequest = async (token) => {
        // 1. Cria um corpo de requisição no formato formulário
        const bodyParams = new URLSearchParams();
        
        // 2. Adiciona todos os parâmetros (ex: id: '123')
        for (const key in params) {
            bodyParams.append(key, params[key]);
        }
        
        // 3. Adiciona o token de autenticação ao corpo
        bodyParams.append('auth', token);
        
        // 4. Faz a chamada POST. O axios vai ver 'bodyParams'
        //    e automaticamente usar o Content-Type correto.
        return axios.post(url, bodyParams);
    };
    // --- FIM DA SOLUÇÃO ---

    try {
        // 1. Tenta a chamada com o access_token atual
        const response = await makeRequest(access_token);
        return response.data;

    } catch (error) {
        // 2. Verifica se o token expirou (lógica de 'expired_token' já está correta)
        const errorType = (error.response && error.response.data && error.response.data.error)
            ? error.response.data.error.toLowerCase()
            : '';
        
        if (errorType === 'expired_token') {
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
            const retryResponse = await makeRequest(newTokens.access_token);
            return retryResponse.data;

        } else {
            // Foi outro tipo de erro
            console.error('Erro na chamada da API:', error.response ? error.response.data : error.message);
            throw new Error('Erro na chamada da API: ' + (error.response ? error.response.data.error_description : error.message));
        }
    }
}
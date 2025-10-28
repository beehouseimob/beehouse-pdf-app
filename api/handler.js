// /api/handler.js
import { call, getFreshTokens } from '../utils/b24.js'; // Importa getFreshTokens

export default async function handler(req, res) {
    console.log('[Handler] Clique de botão detectado.');
    // Log do corpo da requisição pode ser útil para depurar o member_id e PLACEMENT_OPTIONS
    // console.log('[Handler] Request Body:', req.body);

    try {
        // 1. Obtém tokens frescos (busca no KV e renova se necessário) usando member_id do corpo da requisição
        const authTokens = await getFreshTokens(req); // getFreshTokens extrai member_id de req.body.auth.member_id

        if (!authTokens) {
            console.error('[Handler] Falha ao obter/renovar tokens de autenticação.');
            // Tenta extrair member_id para log, se possível
            const memberId = req?.body?.auth?.member_id;
            console.error(`[Handler] Member ID (se disponível): ${memberId}`);
            return res.status(401).send('Erro: Falha na autenticação ou tokens inválidos. Reinstale o aplicativo.');
        }
        console.log('[Handler] Tokens obtidos/renovados com sucesso para member_id:', authTokens.member_id);


        // 2. Pega o ID da Empresa do PLACEMENT_OPTIONS
        let companyId;
        if (req.body.PLACEMENT_OPTIONS) {
            try {
                const placementOptions = JSON.parse(req.body.PLACEMENT_OPTIONS);
                companyId = placementOptions.ID; // O ID da entidade (Empresa) vem aqui
                console.log('[Handler] ID da Empresa extraído de PLACEMENT_OPTIONS:', companyId);
            } catch (parseError) {
                console.error("[Handler] Erro ao parsear PLACEMENT_OPTIONS:", parseError, "Conteúdo:", req.body.PLACEMENT_OPTIONS);
                res.status(400).send('Erro ao processar dados do placement (JSON inválido).');
                return;
            }
        }

        // Validação adicional do companyId
        if (!companyId) {
            console.error("[Handler] Não foi possível encontrar o ID da Empresa em PLACEMENT_OPTIONS:", req.body);
            res.status(400).send('ID da Empresa não encontrado na requisição do placement.');
            return;
        }

        // 3. Busca os dados da Empresa usando a API e os tokens obtidos
        console.log(`[Handler] Buscando dados para Empresa ID: ${companyId}`);
        const company = await call('crm.company.get', { id: companyId }, authTokens); // Passa authTokens

        if (!company) {
            // A API pode retornar null ou um objeto vazio se não encontrar
            console.warn("[Handler] Não foram encontrados dados para a empresa com ID:", companyId);
            // Decide como tratar: erro 404 ou formulário com campos vazios?
            // Vamos prosseguir com campos vazios por enquanto.
            const proprietarioNome = '';
            const proprietarioTelefone = '';
            const proprietarioEmail = '';
            const proprietarioCpf = '';
            // (Continue para enviar o HTML com campos vazios)

        } else {
             console.log('[Handler] Dados da empresa recebidos:', company);
        }

        // --- Preenche os dados (mesmo se 'company' for null/undefined, os || '' garantem strings vazias) ---
        const proprietarioNome = company?.TITLE || '';
        const proprietarioTelefone = (company?.PHONE && company.PHONE.length > 0) ? company.PHONE[0].VALUE : '';
        const proprietarioEmail = (company?.EMAIL && company.EMAIL.length > 0) ? company.EMAIL[0].VALUE : '';
        // *** IMPORTANTE: Verifique se o ID do campo customizado (UF_CRM_...) está correto no SEU Bitrix24 ***
        const proprietarioCpf = company?.UF_CRM_66C37392C9F3D || '';


        // 4. Envia o Formulário HTML como resposta
        console.log('[Handler] Enviando formulário HTML.');
        res.setHeader('Content-Type', 'text/html');
        // (O código HTML extenso foi omitido aqui para clareza, é o mesmo que você já tem)
        res.send(`
            <!DOCTYPE html>
            <html lang="pt-br">
            <head>
                <meta charset="UTF-8">
                <title>Gerar Autorização</title>
                <style>
                    /* Seu CSS aqui... */
                    body { font-family: sans-serif; padding: 20px; }
                    label { display: block; margin-top: 10px; }
                    input, select { width: 95%; padding: 8px; margin-top: 4px; max-width: 400px; }
                    button { padding: 10px 20px; margin-top: 20px; }
                    .form-section { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
                    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
                </style>
            </head>
            <body>
                <h2>Gerar Autorização de Venda</h2>
                <p>Confira os dados pré-preenchidos e preencha os campos manuais.</p>

                <form action="/api/generate-pdf" method="POST" target="_blank">

                    <div class="form-section">
                        <h3>CONTRATANTE</h3>
                        <div class="form-grid">
                            <div>
                                <label>Nome:</label>
                                <input type="text" name="contratanteNome" value="${proprietarioNome}">
                            </div>
                            <div>
                                <label>CPF:</label>
                                <input type="text" name="contratanteCpf" value="${proprietarioCpf}">
                            </div>
                            <div>
                                <label>RG nº:</label>
                                <input type="text" name="contratanteRg" placeholder="Ex: 9.999.999">
                            </div>
                            <div>
                                <label>Profissão:</label>
                                <input type="text" name="contratanteProfissao">
                            </div>
                            <div>
                                <label>Estado Civil:</label>
                                <input type="text" name="contratanteEstadoCivil">
                            </div>
                            <div>
                                <label>Regime de Casamento:</label>
                                <input type="text" name="contratanteRegimeCasamento" placeholder="Se aplicável">
                            </div>
                            <div style="grid-column: 1 / -1;"> {/* Ocupa toda a largura */}
                                <label>Endereço Residencial:</label>
                                <input type="text" name="contratanteEndereco" placeholder="Rua, Nº, Bairro, Cidade - SC">
                            </div>
                            <div>
                                <label>Telefone/Celular:</label>
                                <input type="text" name="contratanteTelefone" value="${proprietarioTelefone}">
                            </div>
                            <div style="grid-column: span 2;"> {/* Ocupa duas colunas se possível */}
                                <label>E-mail:</label>
                                <input type="email" name="contratanteEmail" value="${proprietarioEmail}">
                            </div>
                        </div>
                    </div>

                    {/* ... Seções IMÓVEL e CONTRATO aqui ... */}
                     <div class="form-section">
                         <h3>IMÓVEL</h3>
                         <div class="form-grid">
                              <div style="grid-column: 1 / -1;">
                                 <label>Imóvel (Descrição):</label>
                                 <input type="text" name="imovelDescricao" placeholder="Ex: Apartamento 101, Edifício Sol">
                             </div>
                             <div style="grid-column: 1 / -1;">
                                 <label>Endereço do Imóvel:</label>
                                 <input type="text" name="imovelEndereco" placeholder="Rua, Nº, Bairro, Cidade - SC">
                             </div>
                             <div style="grid-column: span 2;">
                                 <label>Inscrição Imobiliária/Matrícula:</label>
                                 <input type="text" name="imovelMatricula" placeholder="Nº da matrícula no Registro de Imóveis">
                             </div>
                              <div>
                                 <label>Valor do Imóvel (R$):</label>
                                 <input type="number" name="imovelValor" step="0.01" placeholder="500000.00">
                             </div>
                             <div style="grid-column: span 2;">
                                 <label>Administradora de Condomínio:</label>
                                 <input type="text" name="imovelAdminCondominio" placeholder="Se aplicável">
                             </div>
                             <div>
                                 <label>Valor Condomínio (R$):</label>
                                 <input type="number" name="imovelValorCondominio" step="0.01" placeholder="350.00">
                             </div>
                             <div>
                                 <label>Chamada de Capital:</label>
                                 <input type="text" name="imovelChamadaCapital" placeholder="Ex: R$ 100,00 (se houver)">
                             </div>
                              <div style="grid-column: span 2;">
                                 <label>Nº de parcelas (Chamada Capital):</label>
                                 <input type="number" name="imovelNumParcelas" placeholder="Se aplicável">
                             </div>
                         </div>
                     </div>

                     <div class="form-section">
                         <h3>CONTRATO</h3>
                         <div class="form-grid">
                             <div>
                                 <label>Prazo de exclusividade (dias):</label>
                                 <input type="number" name="contratoPrazo" value="90" required>
                             </div>
                              <div>
                                 <label>Comissão (%):</label>
                                 <input type="number" name="contratoComissaoPct" value="6" step="0.1" required>
                             </div>
                         </div>
                     </div>


                    <button type="submit">Gerar PDF</button>
                </form>
            </body>
            </html>
        `);

    } catch (error) {
        console.error('[Handler] Erro detalhado:', error.response?.data || error.details || error.message || error);
        const errorMessage = error.details?.error_description || error.message || 'Erro desconhecido ao processar clique do botão';
        const errorStatus = error.status || 500;
        res.status(errorStatus).send(`Erro ao carregar formulário: ${errorMessage}`);
    }
}
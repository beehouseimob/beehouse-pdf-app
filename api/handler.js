import { call, getAuth } from '../utils/b24.js'; // Importa getAuth também

export default async function handler(req, res) {
    try {
        // *** Adicionado: Obter autenticação primeiro ***
        const { auth } = await getAuth(req);
        if (!auth) {
          // Se getAuth retornar null (ex: falha ao renovar token), trate o erro
          res.status(401).send('Erro: Falha na autenticação ou token inválido.');
          return;
        }

        // 1. Pega o ID da Empresa (Verifique se PLACEMENT_OPTIONS existe em req.body)
        // Se estiver usando Placements, pode ser necessário pegar de req.body diretamente
        // Ajuste conforme necessário dependendo de como o Bitrix24 envia os dados para este handler
        let companyId;
        if (req.body.PLACEMENT_OPTIONS) {
          try {
            const placementOptions = JSON.parse(req.body.PLACEMENT_OPTIONS);
            companyId = placementOptions.ID;
          } catch (parseError) {
             console.error("Erro ao parsear PLACEMENT_OPTIONS:", parseError);
             res.status(400).send('Erro ao processar dados do placement.');
             return;
          }
        } else if (req.body.data && req.body.data.FIELDS && req.body.data.FIELDS.ID) {
          // Se for um webhook de evento (ex: ONCRMCOMPANYADD)
          companyId = req.body.data.FIELDS.ID;
        } else {
            console.error("Não foi possível encontrar o ID da Empresa na requisição:", req.body);
            res.status(400).send('ID da Empresa não encontrado na requisição.');
            return;
        }

        if (!companyId) {
             console.error("ID da Empresa está vazio ou indefinido.");
             res.status(400).send('ID da Empresa inválido.');
             return;
        }


        // 2. Busca os dados da Empresa, passando 'auth'
        // A função 'call' retorna diretamente o objeto 'result' da API Bitrix24
        const company = await call('crm.company.get', { id: companyId }, auth); // *** Passa 'auth' como terceiro argumento ***

        if (!company) {
             console.error("Não foram encontrados dados para a empresa com ID:", companyId);
             // Você pode querer retornar um erro 404 ou apenas continuar com dados vazios
             // res.status(404).send('Empresa não encontrada.');
             // return;
             // Ou definir valores padrão se company for null/undefined:
             const proprietarioNome = '';
             const proprietarioTelefone = '';
             const proprietarioEmail = '';
             const proprietarioCpf = '';
             // Continue com o envio do HTML com campos vazios... (código HTML omitido para brevidade)
             // ... (seu código HTML aqui, usando as variáveis vazias) ...
             res.setHeader('Content-Type', 'text/html');
             res.send(`<!DOCTYPE html>... Formulário com campos vazios ...</html>`); // Adapte seu HTML
             return; // Importante sair aqui se a empresa não foi encontrada e você não quer gerar o PDF
        }

        // --- Dados Automáticos (Pré-preenchidos e EDITÁVEIS) ---
        const proprietarioNome = company.TITLE || '';
        const proprietarioTelefone = (company.PHONE && company.PHONE.length > 0) ? company.PHONE[0].VALUE : '';
        const proprietarioEmail = (company.EMAIL && company.EMAIL.length > 0) ? company.EMAIL[0].VALUE : '';
        const proprietarioCpf = company.UF_CRM_66C37392C9F3D || ''; // <-- TROQUE PELO ID DO SEU CAMPO DE CPF/CNPJ


        // 3. Envia o Formulário HTML como resposta
        res.setHeader('Content-Type', 'text/html');
        // Seu código HTML continua aqui (omitido para brevidade, use as variáveis acima)
        res.send(`
            <!DOCTYPE html>
            <html lang="pt-br">
            <head>
                <meta charset="UTF-8">
                <title>Gerar Autorização</title>
                <style>
                    /* Seu CSS */
                </style>
            </head>
            <body>
                <h2>Gerar Autorização de Venda</h2>
                <p>Confira os dados pré-preenchidos (eles são editáveis) e preencha os campos manuais.</p>

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
                            <div class="grid-col-span-3">
                                <label>Endereço Residencial:</label>
                                <input type="text" name="contratanteEndereco" placeholder="Rua, Nº, Bairro, Cidade - SC">
                            </div>
                            <div>
                                <label>Telefone/Celular:</label>
                                <input type="text" name="contratanteTelefone" value="${proprietarioTelefone}">
                            </div>
                            <div class="grid-col-span-2">
                                <label>E-mail:</label>
                                <input type="email" name="contratanteEmail" value="${proprietarioEmail}">
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3>IMÓVEL</h3>
                        <div class="form-grid">
                             <div class="grid-col-span-3">
                                <label>Imóvel (Descrição):</label>
                                <input type="text" name="imovelDescricao" placeholder="Ex: Apartamento 101, Edifício Sol">
                            </div>
                            <div class="grid-col-span-3">
                                <label>Endereço do Imóvel:</label>
                                <input type="text" name="imovelEndereco" placeholder="Rua, Nº, Bairro, Cidade - SC">
                            </div>
                            <div class="grid-col-span-2">
                                <label>Inscrição Imobiliária/Matrícula:</label>
                                <input type="text" name="imovelMatricula" placeholder="Nº da matrícula no Registro de Imóveis">
                            </div>
                             <div>
                                <label>Valor do Imóvel (R$):</label>
                                <input type="number" name="imovelValor" step="0.01" placeholder="500000.00">
                            </div>
                            <div class="grid-col-span-2">
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
                             <div class="grid-col-span-2">
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
        console.error('Erro detalhado no handler:', error);
        // Tenta extrair a mensagem específica do erro vindo da função 'call'
        const errorMessage = error.details?.error_description || error.message || 'Erro desconhecido';
        const errorStatus = error.status || 500;
        res.status(errorStatus).send(`Erro ao carregar formulario: ${errorMessage}`);
    }
}
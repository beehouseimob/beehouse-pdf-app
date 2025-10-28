import chromium from '@sparticuz/chromium';
import puppeteerCore from 'puppeteer-core';

// Função helper para formatar R$
function formatCurrency(value) {
    if (!value || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Função helper para gerar o HTML da Autorização
function getHtmlContent(data) {
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    const imovelValor = formatCurrency(data.imovelValor);
    const imovelValorCondominio = formatCurrency(data.imovelValorCondominio);

    return `
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <meta charset="UTF-8">
            <title>Autorização de Venda</title>
            <style>
                * { font-family: 'Helvetica', 'Arial', sans-serif; }
                body { margin: 50px; font-size: 10pt; color: #333; line-height: 1.5; }
                .header { text-align: center; margin-bottom: 20px; }
                .header h1 { font-size: 16pt; margin: 0; }
                .header p { font-size: 10pt; margin: 2px 0; }
                .section-title { font-size: 11pt; font-weight: bold; text-decoration: underline; margin-top: 25px; margin-bottom: 10px; }
                .data-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                .data-table td { padding: 4px; vertical-align: top; }
                .data-table label { font-weight: bold; margin-right: 5px; }
                .data-table .value { border-bottom: 1px solid #ccc; min-width: 100px; display: inline-block; line-height: 1.2; }
                .data-table .col1 { width: 33.3%; }
                .data-table .col2 { width: 33.3%; }
                .data-table .col3 { width: 33.3%; }
                .data-table .full-width .value { width: calc(100% - 70px); }
                .data-table .email-width .value { width: calc(100% - 45px); }
                .clausulas { margin-top: 20px; text-align: justify; }
                .clausulas p { margin-bottom: 8px; }
                .assinaturas { margin-top: 50px; text-align: center; }
                .assinaturas .signature-block { display: inline-block; width: 300px; margin-top: 50px; }
                .assinaturas .line { border-bottom: 1px solid #000; margin-bottom: 5px; }
                .assinaturas .label-bold { font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Beehouse Investimentos Imobiliários</h1>
                <p>R. Jacob Eisenhut, 223 - SL 801 - Atiradores - Joinville/SC</p>
                <p>www.beehouse.sc | Fone: (47) 99287-9066</p>
                <h2 style="font-size: 14pt; margin-top: 20px;">AUTORIZAÇÃO DE VENDA</h2>
            </div>

            <div class="section-title">CONTRATANTE</div>
            <table class="data-table">
                <tr>
                    <td class="col1"><label>Nome:</label><span class="value">${data.contratanteNome || '__________'}</span></td>
                    <td class="col2"><label>CPF:</label><span class="value">${data.contratanteCpf || '__________'}</span></td>
                    <td class="col3"><label>RG nº:</label><span class="value">${data.contratanteRg || '__________'}</span></td>
                </tr>
                <tr>
                    <td class="col1"><label>Profissão:</label><span class="value">${data.contratanteProfissao || '__________'}</span></td>
                    <td class="col2"><label>Estado Civil:</label><span class="value">${data.contratanteEstadoCivil || '__________'}</span></td>
                    <td class="col3"><label>Regime:</label><span class="value">${data.contratanteRegimeCasamento || '__________'}</span></td>
                </tr>
                <tr>
                    <td colspan="3" class="full-width"><label>Endereço:</label><span class="value">${data.contratanteEndereco || '__________'}</span></td>
                </tr>
                <tr>
                    <td class="col1"><label>Telefone:</label><span class="value">${data.contratanteTelefone || '__________'}</span></td>
                    <td colspan="2" class="email-width"><label>E-mail:</label><span class="value">${data.contratanteEmail || '__________'}</span></td>
                </tr>
            </table>

            <div class="section-title">IMÓVEL</div>
            <table class="data-table">
                <tr>
                    <td colspan="2"><label>Imóvel:</label><span class="value">${data.imovelDescricao || '__________'}</span></td>
                    <td colspan="1"><label>Endereço:</label><span class="value">${data.imovelEndereco || '__________'}</span></td>
                </tr>
                 <tr>
                    <td class="col1"><label>Matrícula:</label><span class="value">${data.imovelMatricula || '__________'}</span></td>
                    <td class="col2"><label>Valor:</label><span class="value">${imovelValor}</span></td>
                    <td class="col3"><label>Adm. Condomínio:</label><span class="value">${data.imovelAdminCondominio || '__________'}</span></td>
                </tr>
                 <tr>
                    <td class="col1"><label>Condomínio:</label><span class="value">${imovelValorCondominio}</span></td>
                    <td class="col2"><label>Chamada Capital:</label><span class="value">${data.imovelChamadaCapital || '__________'}</span></td>
                    <td class="col3"><label>Nº Parcelas:</label><span class="value">${data.imovelNumParcelas || '__________'}</span></td>
                </tr>
            </table>

            <div class="section-title">CONTRATO</div>
             <table class="data-table">
                 <tr>
                    <td class="col1"><label>Prazo (dias):</label><span class="value">${data.contratoPrazo || '90'}</span></td>
                    <td colspan="2"><label>Comissão (%):</label><span class="value">${data.contratoComissaoPct || '6'}</span></td>
                </tr>
            </table>

            <div class="clausulas">
                <p>O Contratante autoriza a Beehouse Investimentos Imobiliários, inscrita no CNPJ sob n° 14.477.349/0001-23, situada nesta cidade, na Rua Jacob Eisenhut, 223 SL 801 Bairro Atiradores, Cep: 89.203-070 - Joinville-SC, a promover a venda do imóvel com a descrição acima, mediante as seguintes condições:</p>
                <p>1º A venda é concebida a contar desta data pelo prazo de ${data.contratoPrazo || '____'} dias. Após esse período, o contrato permanece por prazo indeterminado ou até manifestação por escrito por quaisquer das partes, pelo menos 15 (quinze) dias anteriores à intenção de cancelamento, observando-se ainda o artigo 726 do Código Civil Vigente.</p>
                <p>2º O Contratante pagará a Contratada, uma vez concluído o negócio a comissão de ${data.contratoComissaoPct || '____'}% sobre o valor da venda, no ato do recebimento do sinal. Esta comissão é devida também mesmo fora do prazo desta autorização desde que a venda do imóvel seja efetuado por cliente apresentado pela Contratada ou nos caso em que, comprovadamente, a negociação tiver sido por esta iniciada, observando também o artigo 727 do Código Civil Brasileiro.</p>
                <p>3º A Contratada compromete-se a fazer publicidade do imóvel, podendo colocar placas, anunciar em jornais e meios de divulgação do imóvel ao público.</p>
                <p>4º O Contratante declara que o imóvel encontra-se livre e desembaraçado, inexistindo quaisquer impedimento judicial e/ou extra judicial que impeça a transferencia de posse, comprometendo-se a fornecer cópia do Registro de Imóveis, CPF, RG e carne de IPTU.</p>
                <p>5º Em caso de qualquer controvérsia decorrente deste contrato, as partes elegem o Foro da Comarca de Joinville/SC para dirimir quaisquer dúvidas deste contrato, renunciando qualquer outro, por mais privilégio que seja.</p>
                <p>Assim por estarem juntos e contratados, obrigam-se a si e seus herdeiros a cumprir e fazer cumprir o disposto neste contrato, assinando-os em duas vias de igual teor e forma, na presença de testemunhas, a tudo presentes.</p>
            </div>

            <div class="assinaturas">
                <p>Joinville, ${dataHoje}</p>
                
                <div class="signature-block" style="float: left; margin-left: 50px;">
                    <div class="line"></div>
                    <div class="label-bold">${(data.contratanteNome || 'CONTRATANTE').toUpperCase()}</div>
                    <div>${data.contratanteCpf || 'CPF/CNPJ'}</div>
                </div>

                <div class="signature-block" style="float: right; margin-right: 50px;">
                    <div class="line"></div>
                    <div class="label-bold">Beehouse Investimentos Imobiliários</div>
                    <div>CNPJ 14.477.349/0001-23</div>
                </div>
            </div>

        </body>
        </html>
    `;
}


export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Metodo nao permitido');
    }

    let browser = null;

    try {
        const data = req.body;
        const htmlContent = getHtmlContent(data);

        console.log('Iniciando Chromium...');
        browser = await puppeteerCore.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport, // <-- ADICIONADO PARA ESTABILIDADE
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });
        
        console.log('Navegador iniciado. Abrindo nova página...');
        const page = await browser.newPage();
        
        console.log('Definindo conteúdo HTML...');
        // ==================================================================
        // AQUI ESTÁ A CORREÇÃO PRINCIPAL:
        // Trocado 'networkidle0' (que causa timeout) por 'load'
        // ==================================================================
        await page.setContent(htmlContent, { waitUntil: 'load' });

        console.log('Gerando buffer do PDF...');
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '50px',
                right: '50px',
                bottom: '50px',
                left: '50px'
            }
        });

        console.log('Fechando navegador...');
        await browser.close();
        browser = null;

        console.log('Enviando PDF como resposta.');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Autorizacao_Venda_${data.contratanteNome || 'Contratante'}.pdf"`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Erro ao gerar PDF com Puppeteer/Chromium:', error);
        if (browser) {
            console.log('Fechando navegador devido a erro...');
            await browser.close();
        }
        res.status(500).send('Erro ao gerar PDF: ' + error.message);
    }
}
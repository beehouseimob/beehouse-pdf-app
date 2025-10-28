import PDFDocument from 'pdfkit';

// --- HELPERS BÁSICOS ---
function formatCurrency(value) {
    if (!value || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function drawHeader(doc) {
    doc.fontSize(16).font('Helvetica-Bold').text('Beehouse Investimentos Imobiliários', MARGIN, MARGIN, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text('R. Jacob Eisenhut, 223 - SL 801 - Atiradores - Joinville/SC', { align: 'center' });
    doc.text('www.beehouse.sc | Fone: (47) 99287-9066', { align: 'center' });
    doc.moveDown(1.5);
    doc.fontSize(14).font('Helvetica-Bold').text('AUTORIZAÇÃO DE VENDA', { align: 'center' });
    doc.moveDown(2);
}

function drawSectionTitle(doc, title) {
    // Note: Removi a opção 'underline: true' aqui, pois não queremos sublinhado nas seções de título também.
    doc.fontSize(11).font('Helvetica-Bold').text(title, MARGIN, doc.y, { 
        width: CONTENT_WIDTH,
        align: 'left'
    });
    doc.moveDown(1); 
    doc.fontSize(10); 
}

// --- CONSTANTES DE LAYOUT ---
const MARGIN = 50;
const PAGE_WIDTH = 612;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2); // 512
const PAGE_END = PAGE_WIDTH - MARGIN; // 562


// ==================================================================
// FUNÇÃO DE GERAÇÃO DE PDF (COM PROMISE - JÁ FUNCIONANDO)
// ==================================================================
async function generatePdfPromise(data) {
    
    return new Promise((resolve, reject) => {
        
        const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('error', (err) => {
            console.error('Erro no stream do PDFKit:', err);
            reject(err);
        });
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            console.log('Stream do PDF finalizado. PDF pronto.');
            resolve(pdfData); 
        });

        try {
            // ==================================================================
            // INÍCIO DA LÓGICA DE DESENHO (NOVO LAYOUT DE TABELA)
            // ==================================================================

            drawHeader(doc);
            
            let y = doc.y;
            const rowHeight = 28; // Altura da linha da tabela
            const labelX = MARGIN + 5; // Padding do Label
            const valueXOffset = 130; // Offset do valor a partir da MARGEM
            const textYPad = 9; // Padding Y do texto (para centralizar na linha)

            // --- Posições X das Colunas ---
            const col1_x = MARGIN;
            const col2_x = MARGIN + (CONTENT_WIDTH / 2); // Divide a página em 2
            
            // --- 2. Seção CONTRATANTE ---
            drawSectionTitle(doc, 'CONTRATANTE');
            y = doc.y;

            // --- Linha 1: Nome (span 2 colunas) ---
            doc.rect(col1_x, y, CONTENT_WIDTH, rowHeight).stroke(); // Caixa da linha
            doc.font('Helvetica-Bold').text('Nome:', labelX, y + textYPad);
            doc.font('Helvetica').text(data.contratanteNome || '', valueXOffset - 25, y + textYPad);
            y += rowHeight;

            // --- Linha 2: CPF / RG ---
            doc.rect(col1_x, y, CONTENT_WIDTH / 2, rowHeight).stroke(); // Caixa 1
            doc.font('Helvetica-Bold').text('CPF:', labelX, y + textYPad);
            doc.font('Helvetica').text(data.contratanteCpf || '', valueXOffset, y + textYPad);
            
            doc.rect(col2_x, y, CONTENT_WIDTH / 2, rowHeight).stroke(); // Caixa 2
            doc.font('Helvetica-Bold').text('RG nº:', col2_x + 5, y + textYPad);
            doc.font('Helvetica').text(data.contratanteRg || '', col2_x + 50, y + textYPad);
            y += rowHeight;

            // --- Linha 3: Profissão (span 2 colunas) ---
            doc.rect(col1_x, y, CONTENT_WIDTH, rowHeight).stroke();
            doc.font('Helvetica-Bold').text('Profissão:', labelX, y + textYPad);
            doc.font('Helvetica').text(data.contratanteProfissao || '', valueXOffset, y + textYPad);
            y += rowHeight;

            // --- Linha 4: Estado Civil / Regime ---
            doc.rect(col1_x, y, CONTENT_WIDTH / 2, rowHeight).stroke(); // Caixa 1
            doc.font('Helvetica-Bold').text('Estado Civil:', labelX, y + textYPad);
            doc.font('Helvetica').text(data.contratanteEstadoCivil || '', valueXOffset, y + textYPad);
            
            doc.rect(col2_x, y, CONTENT_WIDTH / 2, rowHeight).stroke(); // Caixa 2
            doc.font('Helvetica-Bold').text('Regime de Casamento:', col2_x + 5, y + textYPad);
            doc.font('Helvetica').text(data.contratanteRegimeCasamento || '', col2_x + 125, y + textYPad);
            y += rowHeight;

            // --- Linha 5: Endereço (span 2 colunas) ---
            doc.rect(col1_x, y, CONTENT_WIDTH, rowHeight).stroke();
            doc.font('Helvetica-Bold').text('Endereço Residencial:', labelX, y + textYPad);
            doc.font('Helvetica').text(data.contratanteEndereco || '', valueXOffset + 25, y + textYPad, { width: CONTENT_WIDTH - (valueXOffset + 25) - MARGIN });
            y += rowHeight;

            // --- Linha 6: Telefone / E-mail ---
            doc.rect(col1_x, y, CONTENT_WIDTH / 2, rowHeight).stroke(); // Caixa 1
            doc.font('Helvetica-Bold').text('Telefone/Celular:', labelX, y + textYPad);
            doc.font('Helvetica').text(data.contratanteTelefone || '', valueXOffset + 25, y + textYPad);
            
            doc.rect(col2_x, y, CONTENT_WIDTH / 2, rowHeight).stroke(); // Caixa 2
            doc.font('Helvetica-Bold').text('E-mail:', col2_x + 5, y + textYPad);
            doc.font('Helvetica').text(data.contratanteEmail || '', col2_x + 50, y + textYPad);
            y += rowHeight + 15; // + Espaço extra


            // --- 3. Seção IMÓVEL ---
            doc.y = y;
            drawSectionTitle(doc, 'IMÓVEL');
            y = doc.y;

            // --- Linha Imóvel 1: Imóvel / Endereço ---
            doc.rect(col1_x, y, CONTENT_WIDTH / 2, rowHeight).stroke(); // Caixa 1
            doc.font('Helvetica-Bold').text('Imóvel:', labelX, y + textYPad);
            doc.font('Helvetica').text(data.imovelDescricao || '', valueXOffset, y + textYPad);
            
            doc.rect(col2_x, y, CONTENT_WIDTH / 2, rowHeight).stroke(); // Caixa 2
            doc.font('Helvetica-Bold').text('Endereço:', col2_x + 5, y + textYPad);
            doc.font('Helvetica').text(data.imovelEndereco || '', col2_x + 60, y + textYPad);
            y += rowHeight;

            // --- Linha Imóvel 2: Matrícula / Valor / Adm ---
            // Largura de cada célula para 3 colunas, com espaçamento
            const cellWidth3Col = CONTENT_WIDTH / 3;
            
            doc.rect(col1_x, y, cellWidth3Col, rowHeight).stroke(); // Matrícula
            doc.font('Helvetica-Bold').text('Matrícula:', col1_x + 5, y + textYPad);
            doc.font('Helvetica').text(data.imovelMatricula || '', col1_x + 60, y + textYPad);

            doc.rect(col1_x + cellWidth3Col, y, cellWidth3Col, rowHeight).stroke(); // Valor
            doc.font('Helvetica-Bold').text('Valor:', col1_x + cellWidth3Col + 5, y + textYPad);
            doc.font('Helvetica').text(formatCurrency(data.imovelValor) || '', col1_x + cellWidth3Col + 45, y + textYPad);
            
            doc.rect(col1_x + 2 * cellWidth3Col, y, cellWidth3Col, rowHeight).stroke(); // Adm. Condomínio
            doc.font('Helvetica-Bold').text('Adm. Condomínio:', col1_x + 2 * cellWidth3Col + 5, y + textYPad);
            doc.font('Helvetica').text(data.imovelAdminCondominio || '', col1_x + 2 * cellWidth3Col + 105, y + textYPad);
            y += rowHeight;

            // --- Linha Imóvel 3: Condomínio / Chamada / Parcelas ---
            doc.rect(col1_x, y, cellWidth3Col, rowHeight).stroke(); // Condomínio
            doc.font('Helvetica-Bold').text('Condomínio:', col1_x + 5, y + textYPad);
            doc.font('Helvetica').text(formatCurrency(data.imovelValorCondominio) || '', col1_x + 70, y + textYPad);

            doc.rect(col1_x + cellWidth3Col, y, cellWidth3Col, rowHeight).stroke(); // Chamada Capital
            doc.font('Helvetica-Bold').text('Chamada Capital:', col1_x + cellWidth3Col + 5, y + textYPad);
            doc.font('Helvetica').text(data.imovelChamadaCapital || '', col1_x + cellWidth3Col + 100, y + textYPad);
            
            doc.rect(col1_x + 2 * cellWidth3Col, y, cellWidth3Col, rowHeight).stroke(); // Nº Parcelas
            doc.font('Helvetica-Bold').text('Nº Parcelas:', col1_x + 2 * cellWidth3Col + 5, y + textYPad);
            doc.font('Helvetica').text(data.imovelNumParcelas || '', col1_x + 2 * cellWidth3Col + 75, y + textYPad);
            y += rowHeight + 15; // + Espaço extra


            // --- 4. Seção CONTRATO ---
            doc.y = y;
            drawSectionTitle(doc, 'CONTRATO');
            y = doc.y;

            // --- Linha Contrato: Prazo / Comissão ---
            doc.rect(col1_x, y, CONTENT_WIDTH / 2, rowHeight).stroke(); // Caixa 1
            doc.font('Helvetica-Bold').text('Prazo (dias):', labelX, y + textYPad);
            doc.font('Helvetica').text(data.contratoPrazo || '', valueXOffset, y + textYPad);
            
            doc.rect(col2_x, y, CONTENT_WIDTH / 2, rowHeight).stroke(); // Caixa 2
            doc.font('Helvetica-Bold').text('Comissão (%):', col2_x + 5, y + textYPad);
            doc.font('Helvetica').text(data.contratoComissaoPct || '', col2_x + 80, y + textYPad);
            y += rowHeight + 15; // + Espaço extra


            // --- 5. Seção CLÁUSULAS ---
            doc.y = y;
            doc.x = MARGIN; 
            doc.font('Helvetica').fontSize(10);
            
            const textoPreambulo = 'O Contratante autoriza a Beehouse Investimentos Imobiliários, inscrita no CNPJ sob n° 14.477.349/0001-23, situada nesta cidade, na Rua Jacob Eisenhut, 223 SL 801 Bairro Atiradores, Cep: 89.203-070 - Joinville-SC, a promover a venda do imóvel com a descrição acima, mediante as seguintes condições:';
            doc.text(textoPreambulo, { align: 'justify', width: CONTENT_WIDTH });
            doc.moveDown(1);
            
            const clausula1 = `1º A venda é concebida a contar desta data pelo prazo de ${data.contratoPrazo || '____'} dias. Após esse período, o contrato permanece por prazo indeterminado ou até manifestação por escrito por quaisquer das partes, pelo menos 15 (quinze) dias anteriores à intenção de cancelamento, observando-se ainda o artigo 726 do Código Civil Vigente.`;
            doc.text(clausula1, { align: 'justify', width: CONTENT_WIDTH });
            doc.moveDown(0.5);

            const clausula2 = `2º O Contratante pagará a Contratada, uma vez concluído o negócio a comissão de ${data.contratoComissaoPct || '____'}% sobre o valor da venda, no ato do recebimento do sinal. Esta comissão é devida também mesmo fora do prazo desta autorização desde que a venda do imóvel seja efetuado por cliente apresentado pela Contratada ou nos caso em que, comprovadamente, a negociação tiver sido por esta iniciada, observando também o artigo 727 do Código Civil Brasileiro.`;
            doc.text(clausula2, { align: 'justify', width: CONTENT_WIDTH });
            doc.moveDown(0.5);
            
            const clausula3 = '3º A Contratada compromete-se a fazer publicidade do imóvel, podendo colocar placas, anunciar em jornais e meios de divulgação do imóvel ao público.';
            doc.text(clausula3, { align: 'justify', width: CONTENT_WIDTH });
            doc.moveDown(0.5);
            
            const clausula4 = '4º O Contratante declara que o imóvel encontra-se livre e desembaraçado, inexistindo quaisquer impedimento judicial e/ou extra judicial que impeça a transferencia de posse, comprometendo-se a fornecer cópia do Registro de Imóveis, CPF, RG e carne de IPTU.';
            doc.text(clausula4, { align: 'justify', width: CONTENT_WIDTH });
            doc.moveDown(0.5);
            
            const clausula5 = '5º Em caso de qualquer controvérsia decorrente deste contrato, as partes elegem o Foro da Comarca de Joinville/SC para dirimir quaisquer dúvidas deste contrato, renunciando qualquer outro, por mais privilégio que seja.';
            doc.text(clausula5, { align: 'justify', width: CONTENT_WIDTH });
            doc.moveDown(1);

            const textoFechamento = 'Assim por estarem juntos e contratados, obrigam-se a si e seus herdeiros a cumprir e fazer cumprir o disposto neste contrato, assinando-os em duas vias de igual teor e forma, na presença de testemunhas, a tudo presentes.';
            doc.text(textoFechamento, { align: 'justify', width: CONTENT_WIDTH });
            doc.moveDown(2);

            // --- 6. Assinaturas ---
            const dataHoje = new Date().toLocaleDateString('pt-BR');
            doc.text(`Joinville, ${dataHoje}`, { align: 'center', width: CONTENT_WIDTH });
            doc.moveDown(3);

            doc.text('________________________________________', { align: 'center', width: CONTENT_WIDTH });
            doc.font('Helvetica-Bold').text((data.contratanteNome || 'CONTRATANTE').toUpperCase(), { align: 'center', width: CONTENT_WIDTH });
            doc.font('Helvetica').text(data.contratanteCpf || 'CPF/CNPJ', { align: 'center', width: CONTENT_WIDTH });
            
            doc.moveDown(3);
            doc.text('________________________________________', { align: 'center', width: CONTENT_WIDTH });
            doc.font('Helvetica-Bold').text('Beehouse Investimentos Imobiliários', { align: 'center', width: CONTENT_WIDTH });
            doc.font('Helvetica').text('CNPJ 14.477.349/0001-23', { align: 'center', width: CONTENT_WIDTH });
            
            // --- FIM DA LÓGICA DE DESENHO ---

            doc.end();

        } catch (error) {
            console.error('Erro síncrono ao desenhar PDF:', error);
            reject(error);
        }
    });
}


// ==================================================================
// HANDLER (USANDO ASYNC/AWAIT COM A PROMISE - JÁ FUNCIONANDO)
// ==================================================================
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Metodo nao permitido');
    }

    try {
        const data = req.body;
        console.log('Iniciando geração do PDF...');

        const pdfBuffer = await generatePdfPromise(data);

        console.log('PDF pronto. Enviando resposta...');
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Autorizacao_Venda_${data.contratanteNome || 'Contratante'}.pdf"`);
        
        res.end(pdfBuffer);

    } catch (error) {
        console.error('Erro no handler ao gerar PDF:', error);
        res.status(500).send('Erro ao gerar PDF: ' + error.message);
    }
}
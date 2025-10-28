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
    // Título da seção (sem sublinhado)
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
            // INÍCIO DA LÓGICA DE DESENHO (ALINHAMENTO E ESPAÇO CORRIGIDOS)
            // ==================================================================

            drawHeader(doc);
            
            let y = doc.y;
            const rowHeight = 28; // Altura da linha da tabela
            const labelPad = 5; // Padding do Label (à esquerda)
            const valuePad = 5; // Espaço entre Label e Valor
            const textYPad = 9; // Padding Y do texto (para centralizar na linha)
            let labelWidth = 0; // Variável para medir a largura do label

            // --- Posições X das Colunas ---
            const col1_x = MARGIN;
            const col2_x = MARGIN + (CONTENT_WIDTH / 2); // Divide a página em 2
            
            // --- 2. Seção CONTRATANTE ---
            drawSectionTitle(doc, 'CONTRATANTE');
            y = doc.y;

            // --- Linha 1: Nome (span 2 colunas) ---
            doc.rect(col1_x, y, CONTENT_WIDTH, rowHeight).stroke();
            doc.font('Helvetica-Bold').text('Nome:', col1_x + labelPad, y + textYPad);
            labelWidth = doc.widthOfString('Nome:');
            doc.font('Helvetica').text(data.contratanteNome || '', col1_x + labelPad + labelWidth + valuePad, y + textYPad);
            y += rowHeight;

            // --- Linha 2: CPF / RG ---
            doc.rect(col1_x, y, CONTENT_WIDTH / 2, rowHeight).stroke(); // Caixa 1
            doc.font('Helvetica-Bold').text('CPF:', col1_x + labelPad, y + textYPad);
            labelWidth = doc.widthOfString('CPF:');
            doc.font('Helvetica').text(data.contratanteCpf || '', col1_x + labelPad + labelWidth + valuePad, y + textYPad);
            
            doc.rect(col2_x, y, CONTENT_WIDTH / 2, rowHeight).stroke(); // Caixa 2
            doc.font('Helvetica-Bold').text('RG nº:', col2_x + labelPad, y + textYPad);
            labelWidth = doc.widthOfString('RG nº:');
            doc.font('Helvetica').text(data.contratanteRg || '', col2_x + labelPad + labelWidth + valuePad, y + textYPad);
            y += rowHeight;

            // --- Linha 3: Profissão (span 2 colunas) ---
            doc.rect(col1_x, y, CONTENT_WIDTH, rowHeight).stroke();
            doc.font('Helvetica-Bold').text('Profissão:', col1_x + labelPad, y + textYPad);
            labelWidth = doc.widthOfString('Profissão:');
            doc.font('Helvetica').text(data.contratanteProfissao || '', col1_x + labelPad + labelWidth + valuePad, y + textYPad);
            y += rowHeight;

            // --- Linha 4: Estado Civil / Regime ---
            doc.rect(col1_x, y, CONTENT_WIDTH / 2, rowHeight).stroke(); // Caixa 1
            doc.font('Helvetica-Bold').text('Estado Civil:', col1_x + labelPad, y + textYPad);
            labelWidth = doc.widthOfString('Estado Civil:');
            doc.font('Helvetica').text(data.contratanteEstadoCivil || '', col1_x + labelPad + labelWidth + valuePad, y + textYPad);
            
            doc.rect(col2_x, y, CONTENT_WIDTH / 2, rowHeight).stroke(); // Caixa 2
            doc.font('Helvetica-Bold').text('Regime de Casamento:', col2_x + labelPad, y + textYPad);
            labelWidth = doc.widthOfString('Regime de Casamento:');
            doc.font('Helvetica').text(data.contratanteRegimeCasamento || '', col2_x + labelPad + labelWidth + valuePad, y + textYPad);
            y += rowHeight;

            // --- Linha 5: Endereço (span 2 colunas) ---
            doc.rect(col1_x, y, CONTENT_WIDTH, rowHeight).stroke();
            doc.font('Helvetica-Bold').text('Endereço Residencial:', col1_x + labelPad, y + textYPad);
            labelWidth = doc.widthOfString('Endereço Residencial:');
            doc.font('Helvetica').text(data.contratanteEndereco || '', col1_x + labelPad + labelWidth + valuePad, y + textYPad, { 
                width: CONTENT_WIDTH - (labelPad + labelWidth + valuePad) - 10 // Prevenir overflow
            });
            y += rowHeight;

            // --- Linha 6: Telefone / E-mail ---
            doc.rect(col1_x, y, CONTENT_WIDTH / 2, rowHeight).stroke(); // Caixa 1
            doc.font('Helvetica-Bold').text('Telefone/Celular:', col1_x + labelPad, y + textYPad);
            labelWidth = doc.widthOfString('Telefone/Celular:');
            doc.font('Helvetica').text(data.contratanteTelefone || '', col1_x + labelPad + labelWidth + valuePad, y + textYPad);
            
            doc.rect(col2_x, y, CONTENT_WIDTH / 2, rowHeight).stroke(); // Caixa 2
            doc.font('Helvetica-Bold').text('E-mail:', col2_x + labelPad, y + textYPad);
            labelWidth = doc.widthOfString('E-mail:');
            doc.font('Helvetica').text(data.contratanteEmail || '', col2_x + labelPad + labelWidth + valuePad, y + textYPad);
            y += rowHeight + 15; // + Espaço extra


            // --- 3. Seção IMÓVEL ---
            doc.y = y;
            drawSectionTitle(doc, 'IMÓVEL');
            y = doc.y;

            // --- Linha Imóvel 1: Imóvel / Endereço ---
            doc.rect(col1_x, y, CONTENT_WIDTH / 2, rowHeight).stroke(); // Caixa 1
            doc.font('Helvetica-Bold').text('Imóvel:', col1_x + labelPad, y + textYPad);
            labelWidth = doc.widthOfString('Imóvel:');
            doc.font('Helvetica').text(data.imovelDescricao || '', col1_x + labelPad + labelWidth + valuePad, y + textYPad);
            
            doc.rect(col2_x, y, CONTENT_WIDTH / 2, rowHeight).stroke(); // Caixa 2
            doc.font('Helvetica-Bold').text('Endereço:', col2_x + labelPad, y + textYPad);
            labelWidth = doc.widthOfString('Endereço:');
            doc.font('Helvetica').text(data.imovelEndereco || '', col2_x + labelPad + labelWidth + valuePad, y + textYPad);
            y += rowHeight;

            // --- Linha Imóvel 2: Matrícula / Valor / Adm (LAYOUT AJUSTADO) ---
            const colI3_1_x = MARGIN;        // Col 1
            const colI3_2_x = MARGIN + 210;  // Col 2 (Mais espaço para Matrícula)
            const colI3_3_x = MARGIN + 350;  // Col 3 (Mais espaço para Valor)
            const widthCol1 = colI3_2_x - colI3_1_x; // ~210
            const widthCol2 = colI3_3_x - colI3_2_x; // ~140
            const widthCol3 = PAGE_END - colI3_3_x;  // ~162 (PAGE_END é 562)

            doc.rect(colI3_1_x, y, widthCol1, rowHeight).stroke(); // Matrícula
            doc.font('Helvetica-Bold').text('Matrícula:', colI3_1_x + labelPad, y + textYPad);
            labelWidth = doc.widthOfString('Matrícula:');
            doc.font('Helvetica').text(data.imovelMatricula || '', colI3_1_x + labelPad + labelWidth + valuePad, y + textYPad);

            doc.rect(colI3_2_x, y, widthCol2, rowHeight).stroke(); // Valor
            doc.font('Helvetica-Bold').text('Valor:', colI3_2_x + labelPad, y + textYPad);
            labelWidth = doc.widthOfString('Valor:');
            doc.font('Helvetica').text(formatCurrency(data.imovelValor) || '', colI3_2_x + labelPad + labelWidth + valuePad, y + textYPad);
            
            doc.rect(colI3_3_x, y, widthCol3, rowHeight).stroke(); // Adm. Condomínio
            doc.font('Helvetica-Bold').text('Adm. Condomínio:', colI3_3_x + labelPad, y + textYPad);
            labelWidth = doc.widthOfString('Adm. Condomínio:');
            doc.font('Helvetica').text(data.imovelAdminCondominio || '', colI3_3_x + labelPad + labelWidth + valuePad, y + textYPad);
            y += rowHeight;

            // --- Linha Imóvel 3: Condomínio / Chamada / Parcelas (LAYOUT AJUSTADO) ---
            doc.rect(colI3_1_x, y, widthCol1, rowHeight).stroke(); // Condomínio
            doc.font('Helvetica-Bold').text('Condomínio:', colI3_1_x + labelPad, y + textYPad);
            labelWidth = doc.widthOfString('Condomínio:');
            doc.font('Helvetica').text(formatCurrency(data.imovelValorCondominio) || '', colI3_1_x + labelPad + labelWidth + valuePad, y + textYPad);

            doc.rect(colI3_2_x, y, widthCol2, rowHeight).stroke(); // Chamada Capital
            doc.font('Helvetica-Bold').text('Chamada Capital:', colI3_2_x + labelPad, y + textYPad);
            labelWidth = doc.widthOfString('Chamada Capital:');
            doc.font('Helvetica').text(data.imovelChamadaCapital || '', colI3_2_x + labelPad + labelWidth + valuePad, y + textYPad);
            
            doc.rect(colI3_3_x, y, widthCol3, rowHeight).stroke(); // Nº Parcelas
            doc.font('Helvetica-Bold').text('Nº Parcelas:', colI3_3_x + labelPad, y + textYPad);
            labelWidth = doc.widthOfString('Nº Parcelas:');
            doc.font('Helvetica').text(data.imovelNumParcelas || '', colI3_3_x + labelPad + labelWidth + valuePad, y + textYPad);
            y += rowHeight + 15; // + Espaço extra


            // --- 4. Seção CONTRATO ---
            doc.y = y;
            drawSectionTitle(doc, 'CONTRATO');
            y = doc.y;

            // --- Linha Contrato: Prazo / Comissão ---
            doc.rect(col1_x, y, CONTENT_WIDTH / 2, rowHeight).stroke(); // Caixa 1
            doc.font('Helvetica-Bold').text('Prazo (dias):', col1_x + labelPad, y + textYPad);
            labelWidth = doc.widthOfString('Prazo (dias):');
            doc.font('Helvetica').text(data.contratoPrazo || '', col1_x + labelPad + labelWidth + valuePad, y + textYPad);
            
            doc.rect(col2_x, y, CONTENT_WIDTH / 2, rowHeight).stroke(); // Caixa 2
            doc.font('Helvetica-Bold').text('Comissão (%):', col2_x + labelPad, y + textYPad);
            labelWidth = doc.widthOfString('Comissão (%):');
            doc.font('Helvetica').text(data.contratoComissaoPct || '', col2_x + labelPad + labelWidth + valuePad, y + textYPad);
            y += rowHeight + 15; // + Espaço extra


            // --- 5. Seção CLÁUSULAS ---
            doc.y = y;
            doc.x = MARGIN; 
            doc.font('Helvetica').fontSize(10);
            
            // (Baseado em aut.-de-vendas-beehouse-rafael_setembro.pdf)
            const textoPreambulo = 'O Contratante autoriza a Beehouse Investimentos Imobiliários inscrita no CNPJ sob nº 14.477.349/0001-23, situada nesta cidade, na Rua Jacob Eisenhut, 223-SL 801 Bairro Atiradores, Cep: 89.203-070-Joinville-SC, a promover a venda do imóvel com a descrição acima, mediante as seguintes condições:';
            doc.text(textoPreambulo, { align: 'justify', width: CONTENT_WIDTH });
            doc.moveDown(1);
            
            // Cláusula 1 (do PDF mais novo)
            const clausula1 = `1º A venda é concebida a contar desta data pelo prazo de ${data.contratoPrazo || '____'} dias. Após esse período o contrato se encerra.`;
            doc.text(clausula1, { align: 'justify', width: CONTENT_WIDTH });
            doc.moveDown(0.5);

            // Cláusula 2 (do PDF mais novo)
            const clausula2 = `2º O Contratante pagará a Contratada, uma vez concluído o negócio a comissão de ${data.contratoComissaoPct || '6'}% (seis por cento) sobre o valor da venda, no ato do recebimento do sinal. Esta comissão é devida também mesmo fora do prazo desta autorização desde que a venda do imóvel seja efetuado por cliente apresentado pela Contratada ou nos caso em que, comprovadamente, a negociação tiver sido por esta iniciada, observando também o artigo 727 do Código Civil Brasileiro`;
            doc.text(clausula2, { align: 'justify', width: CONTENT_WIDTH });
            doc.moveDown(0.5);
            
            const clausula3 = '3º A Contratada compromete-se a fazer publicidade do imóvel, podendo colocar placas, anunciar em jornais e meios de divulgação do imóvel ao público.';
            doc.text(clausula3, { align: 'justify', width: CONTENT_WIDTH });
            doc.moveDown(0.5);
            
            const clausula4 = '4º O Contratante declara que o imóvel encontra-se livre e desembaraçado, inexistindo quaisquer impedimento judicial e/ou extra judicial que impeça a transferencia de posse, comprometendo-se a fornecer cópia do Registro de Imóveis, CPF, RG e carne de IPTU.';
            doc.text(clausula4, { align: 'justify', width: CONTENT_WIDTH });
            doc.moveDown(0.5);
            
            const clausula5 = '5º Em caso de qualquer controversia decorrente deste contrato, as partes elegem o Foro da Comarca de Joinville/SC para dirimir quaisquer dúvidas deste contrato, renunciando qualquer outro, por mais privilégio que seja.';
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
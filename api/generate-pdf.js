import PDFDocument from 'pdfkit';

// --- CONSTANTES DE LAYOUT ---
const MARGIN = 50;
const PAGE_WIDTH = 612; // A4 em pontos (8.27in * 72pt/in)
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2); // Largura útil

// --- HELPERS ---

// Função helper para formatar R$
function formatCurrency(value) {
    if (!value || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Função helper para desenhar o cabeçalho
function drawHeader(doc) {
    doc.fontSize(16).font('Helvetica-Bold').text('Beehouse Investimentos Imobiliários', MARGIN, MARGIN, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text('R. Jacob Eisenhut, 223 - SL 801 - Atiradores - Joinville/SC', { align: 'center' });
    doc.text('www.beehouse.sc | Fone: (47) 99287-9066', { align: 'center' });
    doc.moveDown(1.5);
    doc.fontSize(14).font('Helvetica-Bold').text('AUTORIZAÇÃO DE VENDA', { align: 'center' });
    doc.moveDown(2); // Mais espaço
}

// Função helper para desenhar um Título de Seção (COM A CORREÇÃO do NaN)
function drawSectionTitle(doc, title) {
    const y = doc.y;
    // Usa a forma explícita (x, y) para evitar o erro NaN
    doc.fontSize(11).font('Helvetica-Bold').text(title, MARGIN, y, { 
        underline: true,
        width: CONTENT_WIDTH,
        align: 'left'
    });
    doc.moveDown(0.7); 
    doc.fontSize(10); // Reseta o tamanho para os campos
}

/**
 * [HELPER] Desenha uma linha com múltiplos campos (colunas).
 * Calcula a altura máxima entre todos os campos da linha antes de desenhar.
 */
function drawRow(doc, fields) {
    const startY = doc.y;
    let currentX = doc.x; // Usa o doc.x atual (deve ser MARGIN)
    let maxHeight = 0;

    // 1. Calcular a altura máxima da linha
    for (const field of fields) {
        const { label, value, labelWidth = 60, colWidth = 150 } = field;
        const val = value || '__________';
        const valueWidth = colWidth - labelWidth;

        const labelH = doc.font('Helvetica-Bold').heightOfString(label, { width: labelWidth });
        const valueH = doc.font('Helvetica').heightOfString(val, { width: valueWidth });
        maxHeight = Math.max(maxHeight, labelH, valueH);
    }

    // 2. Desenhar todos os campos alinhados por 'startY'
    for (const field of fields) {
        const { label, value, labelWidth = 60, colWidth = 150 } = field;
        const val = value || '__________';
        const valueWidth = colWidth - labelWidth;
        
        doc.font('Helvetica-Bold').text(label, currentX, startY, { 
            width: labelWidth, 
            lineBreak: false 
        });
        
        doc.font('Helvetica').text(val, currentX + labelWidth, startY, { 
            width: valueWidth 
        });

        currentX += colWidth;
    }

    // 3. Mover o cursor Y
    doc.y = startY + maxHeight + 8; // +8 de padding
}

/**
 * [HELPER] Desenha um único campo que ocupa a largura total.
 */
function drawField(doc, label, value, options = {}) {
    const { labelWidth = 60 } = options;
    const startY = doc.y;
    const startX = doc.x; // Usa o doc.x atual (deve ser MARGIN)
    const val = value || '__________';
    
    const valueWidth = CONTENT_WIDTH - labelWidth;

    doc.font('Helvetica-Bold').text(label, startX, startY, { 
        width: labelWidth, 
        lineBreak: false 
    });
    
    doc.font('Helvetica').text(val, startX + labelWidth, startY, { 
        width: valueWidth 
    });

    const labelH = doc.heightOfString(label, { width: labelWidth });
    const valueH = doc.heightOfString(val, { width: valueWidth });
    
    doc.y = startY + Math.max(labelH, valueH) + 8; // +8 de padding
}


// --- HANDLER PRINCIPAL ---

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Metodo nao permitido');
    }

    try {
        const data = req.body;
        const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="Autorizacao_Venda_${data.contratanteNome || 'Contratante'}.pdf"`);
            res.send(pdfData);
        });

        // --- 1. Cabeçalho ---
        drawHeader(doc);
        
        // Seta o X inicial para o conteúdo fluir
        doc.x = MARGIN; 

        // --- 2. Seção CONTRATANTE (Layout como o do PDF [cite: 5]) ---
        drawSectionTitle(doc, 'CONTRATANTE');
        
        const col3_1 = (CONTENT_WIDTH * 0.45); // 45%
        const col3_2 = (CONTENT_WIDTH * 0.30); // 30%
        const col3_3 = (CONTENT_WIDTH * 0.25); // 25%
        
        const col2_1 = (CONTENT_WIDTH * 0.4);  // 40%
        const col2_2 = (CONTENT_WIDTH * 0.6);  // 60%

        // --- Linha 1 (Nome, CPF, RG) ---
        drawRow(doc, [
            { label: 'Nome:', value: data.contratanteNome, labelWidth: 40, colWidth: col3_1 },
            { label: 'CPF:', value: data.contratanteCpf, labelWidth: 30, colWidth: col3_2 },
            { label: 'RG nº:', value: data.contratanteRg, labelWidth: 40, colWidth: col3_3 }
        ]);

        // --- Linha 2 (Profissão, Estado Civil, Regime) ---
        drawRow(doc, [
            { label: 'Profissão:', value: data.contratanteProfissao, labelWidth: 55, colWidth: col3_1 },
            { label: 'Estado Civil:', value: data.contratanteEstadoCivil, labelWidth: 65, colWidth: col3_2 },
            { label: 'Regime:', value: data.contratanteRegimeCasamento, labelWidth: 45, colWidth: col3_3 }
        ]);

        // --- Linha 3 (Endereço) ---
        drawField(doc, 'Endereço:', data.contratanteEndereco, { labelWidth: 60 });
        
        // --- Linha 4 (Telefone, E-mail) ---
        drawRow(doc, [
            { label: 'Telefone:', value: data.contratanteTelefone, labelWidth: 50, colWidth: col2_1 },
            { label: 'E-mail:', value: data.contratanteEmail, labelWidth: 40, colWidth: col2_2 }
        ]);

        doc.moveDown(1.5); // Espaço extra

        // ==================================================================
        // SEÇÃO IMÓVEL ATUALIZADA (Baseada no layout da imagem/PDF [cite: 6, 7, 8, 9, 10, 11, 12, 13])
        // ==================================================================
        drawSectionTitle(doc, 'IMÓVEL');

        // --- Linha Imóvel 1 (Imóvel, Endereço)  ---
        const colImovel_2_1 = (CONTENT_WIDTH * 0.5); // 50%
        const colImovel_2_2 = (CONTENT_WIDTH * 0.5); // 50%
        drawRow(doc, [
            { label: 'Imóvel:', value: data.imovelDescricao, labelWidth: 45, colWidth: colImovel_2_1 },
            { label: 'Endereço:', value: data.imovelEndereco, labelWidth: 55, colWidth: colImovel_2_2 }
        ]);
        
        // --- Linha Imóvel 2 (Matrícula, Valor, Adm. Condomínio)  ---
        const colImovel_3_1 = (CONTENT_WIDTH * 0.45); // 45%
        const colImovel_3_2 = (CONTENT_WIDTH * 0.25); // 25%
        const colImovel_3_3 = (CONTENT_WIDTH * 0.30); // 30%
        
        drawRow(doc, [
            { label: 'Matrícula:', value: data.imovelMatricula, labelWidth: 55, colWidth: colImovel_3_1 },
            { label: 'Valor:', value: formatCurrency(data.imovelValor), labelWidth: 35, colWidth: colImovel_3_2 },
            { label: 'Adm. Condomínio:', value: data.imovelAdminCondominio, labelWidth: 95, colWidth: colImovel_3_3 }
        ]);

        // --- Linha Imóvel 3 (Condomínio, Chamada Capital, Nº Parcelas) [cite: 11, 12, 13] ---
        drawRow(doc, [
            { label: 'Condomínio:', value: formatCurrency(data.imovelValorCondominio), labelWidth: 65, colWidth: colImovel_3_1 }, // Reusa 45%
            { label: 'Chamada Capital:', value: data.imovelChamadaCapital, labelWidth: 95, colWidth: colImovel_3_2 }, // Reusa 25%
            { label: 'Nº Parcelas:', value: data.imovelNumParcelas, labelWidth: 65, colWidth: colImovel_3_3 } // Reusa 30%
        ]);

        doc.moveDown(1.5);
        
        // ==================================================================
        // NOVA SEÇÃO - CONTRATO (Dados do handler.js)
        // ==================================================================
        drawSectionTitle(doc, 'CONTRATO');
        
        const colContrato_1 = (CONTENT_WIDTH * 0.5);
        const colContrato_2 = (CONTENT_WIDTH * 0.5);

        drawRow(doc, [
            { label: 'Prazo (dias):', value: data.contratoPrazo, labelWidth: 70, colWidth: colContrato_1 },
            { label: 'Comissão (%):', value: data.contratoComissaoPct, labelWidth: 70, colWidth: colContrato_2 }
        ]);
        
        doc.moveDown(1.5);

        // --- 5. Seção CLÁUSULAS (Layout já era fluido, está OK) ---
        doc.font('Helvetica').fontSize(10);
        doc.x = MARGIN; // Garante que o texto justificado comece na margem
        
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

        // --- 6. Assinaturas (Layout já era fluido, está OK) ---
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
        
        // --- 7. Finaliza o PDF ---
        doc.end();

    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        res.status(500).send('Erro ao gerar PDF: ' + error.message);
    }
}
import PDFDocument from 'pdfkit';

// --- CONSTANTES DE LAYOUT ---
const MARGIN = 50;
const PAGE_WIDTH = 612; // A4 em pontos
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
    doc.moveDown(2);
}

// Função helper para desenhar um Título de Seção (Corrigido)
function drawSectionTitle(doc, title) {
    // Define o Y explicitamente para evitar o erro NaN
    doc.fontSize(11).font('Helvetica-Bold').text(title, MARGIN, doc.y, { 
        underline: true,
        width: CONTENT_WIDTH,
        align: 'left'
    });
    doc.moveDown(0.7); 
    doc.fontSize(10); // Reseta o tamanho
}

/**
 * [NOVA ABORDAGEM - HELPER SIMPLES E ESTATICO]
 * Desenha um Label e um Valor em coordenadas X, Y específicas.
 * Não modifica o doc.y. Apenas desenha e retorna a altura do campo.
 */
function drawFieldAt(doc, label, value, x, y, { labelWidth, valueWidth }) {
    const val = value || '__________';
    
    // Garante que o valor não seja nulo/undefined (causa erros no pdfkit)
    const safeLabel = label || '';
    const safeValue = val ? String(val) : '__________';

    // Desenha Label
    doc.font('Helvetica-Bold').text(safeLabel, x, y, { 
        width: labelWidth, 
        lineBreak: false 
    });
    
    // Desenha Valor
    doc.font('Helvetica').text(safeValue, x + labelWidth, y, { 
        width: valueWidth 
    });

    // Calcula a altura real
    const labelH = doc.heightOfString(safeLabel, { width: labelWidth });
    const valueH = doc.heightOfString(safeValue, { width: valueWidth });
    return Math.max(labelH, valueH);
}


// --- HANDLER PRINCIPAL (COM ORQUESTRAÇÃO MANUAL) ---

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
        
        // Ponto de partida vertical
        let y = doc.y;

        // --- 2. Seção CONTRATANTE ---
        drawSectionTitle(doc, 'CONTRATANTE');
        y = doc.y; // Pega o Y *depois* do título

        // --- Layout Manual da Seção CONTRATANTE ---
        // (Baseado na mistura dos forms e das imagens)

        // Posições X das colunas
        const c1_x = MARGIN;
        const c2_x = 270;
        const c3_x = 420;

        // --- Linha 1: Nome, CPF, RG ---
        let val1_w = (c2_x - c1_x) - 40; // Largura Valor 1 (Label: 40)
        let val2_w = (c3_x - c2_x) - 30; // Largura Valor 2 (Label: 30)
        let val3_w = (CONTENT_WIDTH - (c3_x - MARGIN)) - 40; // Largura Valor 3 (Label: 40)

        let h1 = drawFieldAt(doc, 'Nome:', data.contratanteNome, c1_x, y, { labelWidth: 40, valueWidth: val1_w });
        let h2 = drawFieldAt(doc, 'CPF:', data.contratanteCpf, c2_x, y, { labelWidth: 30, valueWidth: val2_w });
        let h3 = drawFieldAt(doc, 'RG nº:', data.contratanteRg, c3_x, y, { labelWidth: 40, valueWidth: val3_w });
        
        y += Math.max(h1, h2, h3) + 8; // Move o Y para a próxima linha

        // --- Linha 2: Profissão, Estado Civil, Regime ---
        let val4_w = (c2_x - c1_x) - 55; // (Label: 55)
        let val5_w = (c3_x - c2_x) - 65; // (Label: 65)
        let val6_w = (CONTENT_WIDTH - (c3_x - MARGIN)) - 45; // (Label: 45)
        
        let h4 = drawFieldAt(doc, 'Profissão:', data.contratanteProfissao, c1_x, y, { labelWidth: 55, valueWidth: val4_w });
        let h5 = drawFieldAt(doc, 'Estado Civil:', data.contratanteEstadoCivil, c2_x, y, { labelWidth: 65, valueWidth: val5_w });
        let h6 = drawFieldAt(doc, 'Regime:', data.contratanteRegimeCasamento, c3_x, y, { labelWidth: 45, valueWidth: val6_w });
        
        y += Math.max(h4, h5, h6) + 8; // Move o Y

        // --- Linha 3: Endereço (Campo único) ---
        let h7 = drawFieldAt(doc, 'Endereço:', data.contratanteEndereco, MARGIN, y, { labelWidth: 60, valueWidth: CONTENT_WIDTH - 60 });
        y += h7 + 8;
        
        // --- Linha 4: Telefone, E-mail ---
        let val7_w = (c2_x - c1_x) - 50; // (Label: 50)
        let val8_w = (CONTENT_WIDTH - (c2_x - MARGIN)) - 40; // (Label: 40)

        let h8 = drawFieldAt(doc, 'Telefone:', data.contratanteTelefone, c1_x, y, { labelWidth: 50, valueWidth: val7_w });
        let h9 = drawFieldAt(doc, 'E-mail:', data.contratanteEmail, c2_x, y, { labelWidth: 40, valueWidth: val8_w });
        
        y += Math.max(h8, h9) + 15; // Move o Y e dá espaço extra


        // --- 3. Seção IMÓVEL ---
        drawSectionTitle(doc, 'IMÓVEL');
        y = doc.y; // Pega o Y *depois* do título

        // --- Layout Manual da Seção IMÓVEL ---
        // (Baseado na image_9723ef.png e form)
        
        const cI1_x = MARGIN;
        const cI2_x = 330; // 50/50ish

        // --- Linha Imóvel 1: Imóvel, Endereço ---
        let valI1_w = (cI2_x - cI1_x) - 45; // (Label: 45)
        let valI2_w = (CONTENT_WIDTH - (cI2_x - MARGIN)) - 55; // (Label: 55)
        
        let hI1 = drawFieldAt(doc, 'Imóvel:', data.imovelDescricao, cI1_x, y, { labelWidth: 45, valueWidth: valI1_w });
        let hI2 = drawFieldAt(doc, 'Endereço:', data.imovelEndereco, cI2_x, y, { labelWidth: 55, valueWidth: valI2_w });
        y += Math.max(hI1, hI2) + 8;

        // --- Linha Imóvel 2: Matrícula, Valor, Adm. Condomínio ---
        // (Layout da primeira imagem, pois a segunda é incompleta)
        const cI3_x = 270;
        const cI4_x = 420;
        
        let valI3_w = (cI3_x - cI1_x) - 55; // (Label: 55)
        let valI4_w = (cI4_x - cI3_x) - 35; // (Label: 35)
        let valI5_w = (CONTENT_WIDTH - (cI4_x - MARGIN)) - 95; // (Label: 95)

        let hI3 = drawFieldAt(doc, 'Matrícula:', data.imovelMatricula, cI1_x, y, { labelWidth: 55, valueWidth: valI3_w });
        let hI4 = drawFieldAt(doc, 'Valor:', formatCurrency(data.imovelValor), cI3_x, y, { labelWidth: 35, valueWidth: valI4_w });
        let hI5 = drawFieldAt(doc, 'Adm. Condomínio:', data.imovelAdminCondominio, cI4_x, y, { labelWidth: 95, valueWidth: valI5_w });
        y += Math.max(hI3, hI4, hI5) + 8;
        
        // --- Linha Imóvel 3: Condomínio, Chamada, Parcelas ---
        let valI6_w = (cI3_x - cI1_x) - 65; // (Label: 65)
        let valI7_w = (cI4_x - cI3_x) - 95; // (Label: 95)
        let valI8_w = (CONTENT_WIDTH - (cI4_x - MARGIN)) - 65; // (Label: 65)

        let hI6 = drawFieldAt(doc, 'Condomínio:', formatCurrency(data.imovelValorCondominio), cI1_x, y, { labelWidth: 65, valueWidth: valI6_w });
        let hI7 = drawFieldAt(doc, 'Chamada Capital:', data.imovelChamadaCapital, cI3_x, y, { labelWidth: 95, valueWidth: valI7_w });
        let hI8 = drawFieldAt(doc, 'Nº Parcelas:', data.imovelNumParcelas, cI4_x, y, { labelWidth: 65, valueWidth: valI8_w });
        y += Math.max(hI6, hI7, hI8) + 15; // Move e dá espaço


        // --- 4. Seção CONTRATO ---
        drawSectionTitle(doc, 'CONTRATO');
        y = doc.y; // Pega o Y *depois* do título

        // --- Linha Contrato 1: Prazo, Comissão ---
        let valK1_w = (cI2_x - cI1_x) - 70; // (Label: 70)
        let valK2_w = (CONTENT_WIDTH - (cI2_x - MARGIN)) - 70; // (Label: 70)
        
        let hK1 = drawFieldAt(doc, 'Prazo (dias):', data.contratoPrazo, cI1_x, y, { labelWidth: 70, valueWidth: valK1_w });
        let hK2 = drawFieldAt(doc, 'Comissão (%):', data.contratoComissaoPct, cI2_x, y, { labelWidth: 70, valueWidth: valK2_w });
        y += Math.max(hK1, hK2) + 15; // Move e dá espaço


        // --- 5. Seção CLÁUSULAS ---
        // Seta o Y final para as cláusulas fluírem
        doc.y = y;
        doc.x = MARGIN; // Reseta o X para o texto justificado
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
        
        // --- 7. Finaliza o PDF ---
        doc.end();

    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        res.status(500).send('Erro ao gerar PDF: ' + error.message);
    }
}
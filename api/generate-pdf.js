import PDFDocument from 'pdfkit';
import path from 'path'; 
import { fileURLToPath } from 'url'; 

// --- HELPERS BÁSICOS ---
function formatCurrency(value) {
    if (!value || isNaN(value)) return ''; 
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// --- CONSTANTES DE LAYOUT ---
const MARGIN = 50;
const PAGE_WIDTH = 612;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2); 
const PAGE_END = PAGE_WIDTH - MARGIN; 

// --- FUNÇÃO DE HEADER (CORRIGIDA) ---
function drawHeader(doc) {
    try {
        const __filename = fileURLToPath(import.meta.url); 
        const __dirname = path.dirname(__filename);      
        const logoPath = path.join(__dirname, '..', 'images', 'logo.jpeg'); 
        console.log('Tentando carregar logo de:', logoPath); 

        // Logo pequeno na esquerda
        doc.image(logoPath, MARGIN, MARGIN - 5, { width: 80 }); 
        doc.font('Helvetica-Bold').fontSize(11).text('Beehouse Investimentos Imobiliários', MARGIN + 90, MARGIN + 10); // Ajustado X

    } catch (imageError) {
         console.error("Erro ao carregar o logo:", imageError.message);
         doc.font('Helvetica-Bold').fontSize(11).text('Beehouse Investimentos Imobiliários', MARGIN, MARGIN + 10);
    }

    // Título Central
    doc.font('Helvetica-Bold').fontSize(12).text('Autorização de Venda', MARGIN, MARGIN + 25, { width: CONTENT_WIDTH, align: 'center' });
    
    // Bloco da Direita
    const rightAlignX = PAGE_WIDTH - MARGIN - 250; 
    doc.font('Helvetica').fontSize(9).text('R. Jacob Eisenhut, 223 - SL 801 - Atiradores - Joinville/SC', rightAlignX, MARGIN, { width: 250, align: 'right' });
    doc.text('www.beehouse.sc | Fone: (47) 99287-9066', rightAlignX, MARGIN + 12, { width: 250, align: 'right' });
    
    // Mais espaço abaixo
    doc.y = MARGIN + 65; 
}

// ==================================================================
// FUNÇÃO DE GERAÇÃO DE PDF (COM LÓGICA CONDICIONAL)
// ==================================================================
async function generatePdfPromise(data) {
    
    return new Promise((resolve, reject) => {
        
        const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('error', (err) => reject(err));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        try {
            drawHeader(doc);
            
            let y = doc.y;
            const textPad = 5; 
            const textYPad = 7; 
            const labelBoxWidth = 22; 
            const fieldBoxX = MARGIN + labelBoxWidth; 
            const endX = MARGIN + CONTENT_WIDTH; 
            let labelWidth = 0; 
            const rowHeight = 20; 

            // --- LÓGICA CONDICIONAL PARA CONTRATANTES ---
            const authType = data.authType;
            const numSocios = parseInt(data.numSocios, 10) || 1; // Padrão 1 se não for sócios

            for (let i = 0; i < numSocios; i++) {
                const prefix = numSocios > 1 ? `socio${i+1}` : 'contratante';
                const titulo = numSocios > 1 ? `SÓCIO ${i+1}` : 'CONTRATANTE';
                
                 // Se for a segunda iteração ou mais, adiciona espaço extra
                 if (i > 0) {
                     y += 20; // Espaço entre sócios
                 }

                // Desenha o bloco para cada contratante/sócio
                const yC = y;
                const hC = rowHeight * 5; // Altura do bloco (5 linhas)
                
                doc.rect(MARGIN, yC, CONTENT_WIDTH, hC).stroke(); 
                doc.rect(MARGIN, yC, labelBoxWidth, hC).stroke(); 
                doc.save().translate(MARGIN + labelBoxWidth/2, yC + hC/2).rotate(-90).font('Helvetica-Bold').fontSize(10).text(titulo, -hC/2 + 5, 0, { width: hC, align: 'center' }).restore();

                const xC_1 = fieldBoxX;
                const xC_2 = fieldBoxX + (CONTENT_WIDTH - labelBoxWidth) / 2;
                let yRow = yC;

                // Linha 1: nome / profissão
                doc.moveTo(fieldBoxX, yRow + rowHeight).lineTo(endX, yRow + rowHeight).stroke();
                doc.moveTo(xC_2, yRow).lineTo(xC_2, yRow + rowHeight).stroke();
                doc.font('Helvetica-Bold').fontSize(9).text('nome:', xC_1 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('nome:');
                doc.font('Helvetica').fontSize(9).text(data[`${prefix}Nome`] || '', xC_1 + textPad + labelWidth + textPad, yRow + textYPad);
                doc.font('Helvetica-Bold').fontSize(9).text('profissão:', xC_2 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('profissão:');
                doc.font('Helvetica').fontSize(9).text(data[`${prefix}Profissao`] || '', xC_2 + textPad + labelWidth + textPad, yRow + textYPad);
                yRow += rowHeight;

                // Linha 2: CPF / RG
                doc.moveTo(fieldBoxX, yRow + rowHeight).lineTo(endX, yRow + rowHeight).stroke();
                doc.moveTo(xC_2, yRow).lineTo(xC_2, yRow + rowHeight).stroke();
                doc.font('Helvetica-Bold').fontSize(9).text('CPF:', xC_1 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('CPF:');
                doc.font('Helvetica').fontSize(9).text(data[`${prefix}Cpf`] || '', xC_1 + textPad + labelWidth + textPad, yRow + textYPad);
                doc.font('Helvetica-Bold').fontSize(9).text('RG:', xC_2 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('RG:');
                doc.font('Helvetica').fontSize(9).text(data[`${prefix}Rg`] || '', xC_2 + textPad + labelWidth + textPad, yRow + textYPad);
                yRow += rowHeight;

                // Linha 3: Estado Civil / Regime
                doc.moveTo(fieldBoxX, yRow + rowHeight).lineTo(endX, yRow + rowHeight).stroke();
                doc.moveTo(xC_2, yRow).lineTo(xC_2, yRow + rowHeight).stroke();
                doc.font('Helvetica-Bold').fontSize(9).text('Estado Civil:', xC_1 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('Estado Civil:');
                doc.font('Helvetica').fontSize(9).text(data[`${prefix}EstadoCivil`] || '', xC_1 + textPad + labelWidth + textPad, yRow + textYPad);
                doc.font('Helvetica-Bold').fontSize(9).text('Regime de Casamento:', xC_2 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('Regime de Casamento:');
                doc.font('Helvetica').fontSize(9).text(data[`${prefix}RegimeCasamento`] || '', xC_2 + textPad + labelWidth + textPad, yRow + textYPad);
                yRow += rowHeight;

                // Linha 4: Endereço Residencial
                doc.moveTo(fieldBoxX, yRow + rowHeight).lineTo(endX, yRow + rowHeight).stroke();
                doc.font('Helvetica-Bold').fontSize(9).text('Endereço Residencial:', xC_1 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('Endereço Residencial:');
                doc.font('Helvetica').fontSize(9).text(data[`${prefix}Endereco`] || '', xC_1 + textPad + labelWidth + textPad, yRow + textYPad);
                yRow += rowHeight;

                // Linha 5: Email
                doc.font('Helvetica-Bold').fontSize(9).text('Email:', xC_1 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('Email:');
                doc.font('Helvetica').fontSize(9).text(data[`${prefix}Email`] || '', xC_1 + textPad + labelWidth + textPad, yRow + textYPad);

                y = yRow + rowHeight; // Atualiza y global
            } // Fim do loop de sócios/contratante

             // --- Bloco CÔNJUGE (se authType for 'casado') ---
             if (authType === 'casado') {
                 y += 15; // Espaço antes do bloco Cônjuge
                 const yConj = y;
                 const hConj = rowHeight * 2; // Altura para 2 linhas (Nome/CPF/RG + Profissão)

                 doc.rect(MARGIN, yConj, CONTENT_WIDTH, hConj).stroke(); 
                 doc.rect(MARGIN, yConj, labelBoxWidth, hConj).stroke(); 
                 doc.save().translate(MARGIN + labelBoxWidth/2, yConj + hConj/2).rotate(-90).font('Helvetica-Bold').fontSize(10).text('CÔNJUGE', -hConj/2 + 5, 0, { width: hConj, align: 'center' }).restore();

                 const xConj_1 = fieldBoxX;
                 const xConj_2 = fieldBoxX + (CONTENT_WIDTH - labelBoxWidth) / 3; // ~33%
                 const xConj_3 = fieldBoxX + 2*(CONTENT_WIDTH - labelBoxWidth) / 3; // ~66%
                 let yRowConj = yConj;

                 // Linha 1 Cônjuge: Nome / CPF / RG
                 doc.moveTo(fieldBoxX, yRowConj + rowHeight).lineTo(endX, yRowConj + rowHeight).stroke(); // H
                 doc.moveTo(xConj_2, yRowConj).lineTo(xConj_2, yRowConj + rowHeight).stroke(); // V
                 doc.moveTo(xConj_3, yRowConj).lineTo(xConj_3, yRowConj + rowHeight).stroke(); // V
                 doc.font('Helvetica-Bold').fontSize(9).text('Nome:', xConj_1 + textPad, yRowConj + textYPad);
                 labelWidth = doc.widthOfString('Nome:');
                 doc.font('Helvetica').fontSize(9).text(data.conjugeNome || '', xConj_1 + textPad + labelWidth + textPad, yRowConj + textYPad);

                 doc.font('Helvetica-Bold').fontSize(9).text('CPF:', xConj_2 + textPad, yRowConj + textYPad);
                 labelWidth = doc.widthOfString('CPF:');
                 doc.font('Helvetica').fontSize(9).text(data.conjugeCpf || '', xConj_2 + textPad + labelWidth + textPad, yRowConj + textYPad);

                 doc.font('Helvetica-Bold').fontSize(9).text('RG:', xConj_3 + textPad, yRowConj + textYPad);
                 labelWidth = doc.widthOfString('RG:');
                 doc.font('Helvetica').fontSize(9).text(data.conjugeRg || '', xConj_3 + textPad + labelWidth + textPad, yRowConj + textYPad);
                 yRowConj += rowHeight;

                 // Linha 2 Cônjuge: Profissão (Span all)
                 // Sem H (última linha)
                 doc.font('Helvetica-Bold').fontSize(9).text('Profissão:', xConj_1 + textPad, yRowConj + textYPad);
                 labelWidth = doc.widthOfString('Profissão:');
                 doc.font('Helvetica').fontSize(9).text(data.conjugeProfissao || '', xConj_1 + textPad + labelWidth + textPad, yRowConj + textYPad);
                 
                 y = yRowConj + rowHeight; // Atualiza y global
             }


            y += 15; // Espaço antes do bloco Imóvel
            
            // ==================================================================
            // 2. Bloco IMÓVEL (LAYOUT MANTIDO, ESPAÇO AJUSTADO)
            // ==================================================================
            const yI = y;
            const rHI = 20; // Altura da Linha
            const hI = rHI * 6; // Altura Total (6 linhas)

            // Desenha caixas externas
            doc.rect(MARGIN, yI, CONTENT_WIDTH, hI).stroke(); // Caixa externa
            doc.rect(MARGIN, yI, labelBoxWidth, hI).stroke(); // Caixa do label vertical

            // Desenha Texto Vertical IMÓVEL
            doc.save().translate(MARGIN + labelBoxWidth/2, yI + hI/2).rotate(-90).font('Helvetica-Bold').fontSize(10).text('IMÓVEL', -hI/2 + 5, 0, { width: hI, align: 'center' }).restore();

            // --- Define Colunas Internas ---
            const xI_1 = fieldBoxX;
            const xI_2 = fieldBoxX + 318; // Col 2 (para Valor)

            // --- Linha 1 (Imóvel, Valor) ---
            let yIRow = yI;
            doc.moveTo(fieldBoxX, yIRow + rHI).lineTo(endX, yIRow + rHI).stroke(); // H
            doc.moveTo(xI_2, yIRow).lineTo(xI_2, yIRow + rHI).stroke(); // V
            doc.font('Helvetica-Bold').fontSize(9).text('Imóvel:', xI_1 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Imóvel:');
            doc.font('Helvetica').fontSize(9).text(data.imovelDescricao || '', xI_1 + textPad + labelWidth + textPad, yIRow + textYPad);
            
            doc.font('Helvetica-Bold').fontSize(9).text('Valor:', xI_2 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Valor:');
            doc.font('Helvetica').fontSize(9).text(formatCurrency(data.imovelValor) || '', xI_2 + textPad + labelWidth + textPad, yIRow + textYPad);

            // --- Linha 2 (Endereço) ---
            yIRow += rHI;
            doc.moveTo(fieldBoxX, yIRow + rHI).lineTo(endX, yIRow + rHI).stroke(); // H
            doc.font('Helvetica-Bold').fontSize(9).text('Endereço:', xI_1 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Endereço:');
            doc.font('Helvetica').fontSize(9).text(data.imovelEndereco || '', xI_1 + textPad + labelWidth + textPad, yIRow + textYPad);

            // --- Linha 3 (Inscrição Imobiliária) ---
            yIRow += rHI;
            doc.moveTo(fieldBoxX, yIRow + rHI).lineTo(endX, yIRow + rHI).stroke(); // H
            doc.font('Helvetica-Bold').fontSize(9).text('Inscrição Imobiliária/Registro de Imóveis/Matrícula:', xI_1 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Inscrição Imobiliária/Registro de Imóveis/Matrícula:');
            doc.font('Helvetica').fontSize(9).text(data.imovelMatricula || '', xI_1 + textPad + labelWidth + textPad, yIRow + textYPad);

            // --- Linha 4 (Administradora) ---
            yIRow += rHI;
            doc.moveTo(fieldBoxX, yIRow + rHI).lineTo(endX, yIRow + rHI).stroke(); // H
            doc.font('Helvetica-Bold').fontSize(9).text('Administradora de Condomínio:', xI_1 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Administradora de Condomínio:');
            doc.font('Helvetica').fontSize(9).text(data.imovelAdminCondominio || '', xI_1 + textPad + labelWidth + textPad, yIRow + textYPad);

            // --- Linha 5 (Condomínio, Chamada, Parcelas - ESPAÇAMENTO AJUSTADO) ---
            yIRow += rHI;
            // AJUSTADO: Dando mais espaço para Chamada Capital
            const xI_L5_2 = fieldBoxX + 160; // Col 2 (Menor)
            const xI_L5_3 = fieldBoxX + 360; // Col 3 (Mais espaço p/ Chamada)
            doc.moveTo(fieldBoxX, yIRow + rHI).lineTo(endX, yIRow + rHI).stroke(); // H
            doc.moveTo(xI_L5_2, yIRow).lineTo(xI_L5_2, yIRow + rHI).stroke(); // V
            doc.moveTo(xI_L5_3, yIRow).lineTo(xI_L5_3, yIRow + rHI).stroke(); // V
            
            doc.font('Helvetica-Bold').fontSize(9).text('Condomínio-Valor R$:', xI_1 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Condomínio-Valor R$:');
            doc.font('Helvetica').fontSize(9).text(formatCurrency(data.imovelValorCondominio) || '', xI_1 + textPad + labelWidth + textPad, yIRow + textYPad);
            
            doc.font('Helvetica-Bold').fontSize(9).text('Chamada de Capital R$:', xI_L5_2 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Chamada de Capital R$:');
            doc.font('Helvetica').fontSize(9).text(data.imovelChamadaCapital || '', xI_L5_2 + textPad + labelWidth + textPad, yIRow + textYPad);
            
            doc.font('Helvetica-Bold').fontSize(9).text('Nº de parcelas:', xI_L5_3 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Nº de parcelas:');
            doc.font('Helvetica').fontSize(9).text(data.imovelNumParcelas || '', xI_L5_3 + textPad + labelWidth + textPad, yIRow + textYPad);

            // --- Linha 6 (Exclusividade, Prazo) ---
            yIRow += rHI;
            const xI_L6_2 = fieldBoxX + 220; // Ajustado X para Checkbox e Prazo
            doc.moveTo(xI_L6_2, yIRow).lineTo(xI_L6_2, yIRow + rHI).stroke(); // V
            doc.font('Helvetica-Bold').fontSize(9).text('Exclusividade(*):', xI_1 + textPad, yIRow + textYPad);
            
            // Checkboxes (desenhando caixas vazias)
            doc.rect(xI_1 + 90, yIRow + textYPad - 2, 8, 8).stroke();
            doc.font('Helvetica').fontSize(9).text('SIM', xI_1 + 100, yIRow + textYPad);
            doc.rect(xI_1 + 130, yIRow + textYPad - 2, 8, 8).stroke();
            doc.font('Helvetica').fontSize(9).text('NÃO', xI_1 + 140, yIRow + textYPad);
            
            doc.font('Helvetica-Bold').fontSize(9).text('Prazo de exclusividade:', xI_L6_2 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Prazo de exclusividade:');
            doc.font('Helvetica').fontSize(9).text((data.contratoPrazo || '') + ' dias', xI_L6_2 + textPad + labelWidth + textPad, yIRow + textYPad);

            y = yIRow + rHI + 10; // Move Y para baixo do bloco
            
            // --- 3. Seção CLÁUSULAS ---
            doc.y = y; // Seta a posição Y para o fluxo de texto
            doc.x = MARGIN; 
            doc.font('Helvetica').fontSize(9); // Fonte menor para cláusulas
            
            const textoPreambulo = 'O Contratante autoriza a Beehouse Investimentos Imobiliários inscrita no CNPJ sob nº 14.477.349/0001-23, situada nesta cidade, na Rua Jacob Eisenhut, 223 - SL 801 Bairro Atiradores, Cep: 89.203-070 - Joinville-SC, a promover a venda do imóvel com a descrição acima, mediante as seguintes condições:';
            doc.text(textoPreambulo, { align: 'justify', width: CONTENT_WIDTH });
            doc.moveDown(1);
            
            // Cláusula 1
            doc.font('Helvetica-Bold').text('1º', MARGIN, doc.y, { continued: true, indent: 0 });
            doc.font('Helvetica').text(` A venda é concebida a contar desta data pelo prazo e forma acima definidos. Após esse período o contrato se encerra.`, {indent: 10, align: 'justify', width: CONTENT_WIDTH - 10 });
            doc.moveDown(0.5);

            // Cláusula 2
            doc.font('Helvetica-Bold').text('2º', MARGIN, doc.y, { continued: true, indent: 0 });
            doc.font('Helvetica').text(` O Contratante pagará a Contratada, uma vez concluído o negócio a comissão de ${data.contratoComissaoPct || '6'}% (seis por cento) sobre o valor da venda, no ato do recebimento do sinal. Esta comissão é devida também mesmo fora do prazo desta autorização desde que a venda do imóvel seja efetuado por cliente apresentado pela Contratada ou nos caso em que, comprovadamente, a negociação tiver sido por esta iniciada, observando também o artigo 727 do Código Civil Brasileiro`, {indent: 10, align: 'justify', width: CONTENT_WIDTH - 10 });
            doc.moveDown(0.5);
            
            // Cláusula 3
            doc.font('Helvetica-Bold').text('3º', MARGIN, doc.y, { continued: true, indent: 0 });
            doc.font('Helvetica').text(' A Contratada compromete-se a fazer publicidade do imóvel, podendo colocar placas, anunciar em jornais e meios de divulgação do imóvel ao público.', {indent: 10, align: 'justify', width: CONTENT_WIDTH - 10 });
            doc.moveDown(0.5);
            
            // Cláusula 4
            doc.font('Helvetica-Bold').text('4º', MARGIN, doc.y, { continued: true, indent: 0 });
            doc.font('Helvetica').text(' O Contratante declara que o imóvel encontra-se livre e desembaraçado, inexistindo quaisquer impedimento judicial e/ou extra judicial que impeça a transferencia de posse, comprometendo-se a fornecer cópia do Registro de Imóveis, CPF, RG e carne de IPTU.', {indent: 10, align: 'justify', width: CONTENT_WIDTH - 10 });
            doc.moveDown(0.5);
            
            // Cláusula 5
            doc.font('Helvetica-Bold').text('5º', MARGIN, doc.y, { continued: true, indent: 0 });
            doc.font('Helvetica').text(' Em caso de qualquer controversia decorrente deste contrato, as partes elegem o Foro da Comarca de Joinville/SC para dirimir quaisquer dúvidas deste contrato, renunciando qualquer outro, por mais privilégio que seja.', {indent: 10, align: 'justify', width: CONTENT_WIDTH - 10 });
            doc.moveDown(1);

            const textoFechamento = 'Assim por estarem juntos e contratados, obrigam-se a si e seus herdeiros a cumprir e fazer cumprir o disposto neste contrato, assinando-os em duas vias de igual teor e forma, na presença de testemunhas, a tudo presentes.';
            doc.text(textoFechamento, { align: 'justify', width: CONTENT_WIDTH });
            doc.moveDown(2);

            // --- 4. Assinaturas ---
            const dataHoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
            doc.font('Helvetica-Bold').fontSize(9).text('Local e data:', MARGIN, doc.y);
            doc.font('Helvetica').fontSize(9).text(`Joinville, ${dataHoje}`, MARGIN + 60, doc.y);
            doc.moveDown(3);

            const sigY = doc.y;
            const sigLeftX = MARGIN + 40;
            const sigRightX = MARGIN + 300;
            const sigWidth = 220;

            // Assinatura Esquerda (Beehouse)
            doc.moveTo(sigLeftX, sigY).lineTo(sigLeftX + sigWidth, sigY).stroke();
            doc.font('Helvetica-Bold').fontSize(8).text('Beehouse Investimentos Imobiliários', sigLeftX, sigY + 5, { width: sigWidth, align: 'center' });
            doc.fontSize(8).text('CNPJ 14.477.349/0001-23', sigLeftX, sigY + 15, { width: sigWidth, align: 'center' });

            // Assinatura Direita (Contratante)
            doc.moveTo(sigRightX, sigY).lineTo(sigRightX + sigWidth, sigY).stroke();
            doc.font('Helvetica-Bold').fontSize(8).text('CONTRATANTE', sigRightX, sigY + 5, { width: sigWidth, align: 'center' });
            
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
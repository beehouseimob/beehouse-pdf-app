import PDFDocument from 'pdfkit';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Metodo nao permitido');
    }

    try {
        // 1. Pega TODOS os dados do formulário
        const {
            proprietarioNome,
            proprietarioDoc,
            proprietarioTelefone,
            imovelEndereco,
            imovelMatricula,
            valorVenda,
            comissaoPct,
            prazoDias
        } = req.body;

        // 2. Formata os valores
        const valorVendaFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorVenda);
        const dataHoje = new Date().toLocaleDateString('pt-BR');

        // 3. Inicia a criação do PDF
        const doc = new PDFDocument({ margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Autorizacao_Venda_${proprietarioNome}.pdf"`);

        // Conecta o PDF na resposta da Vercel
        doc.pipe(res);

        // --- 4. Monta o Documento (Ajuste o texto como quiser) ---
        doc.fontSize(16).text('AUTORIZAÇÃO DE VENDA DE IMÓVEL', { align: 'center' });
        doc.moveDown(2);

        doc.fontSize(11).text('DADOS DO(A) PROPRIETÁRIO(A):', { underline: true });
        doc.fontSize(10).text(`Nome: ${proprietarioNome || ''}`);
        doc.text(`CPF/CNPJ: ${proprietarioDoc || ''}`);
        doc.text(`Telefone: ${proprietarioTelefone || ''}`);
        doc.moveDown(1);

        doc.fontSize(11).text('DADOS DO IMÓVEL:', { underline: true });
        doc.fontSize(10).text(`Endereço: ${imovelEndereco || ''}`);
        doc.text(`Matrícula: ${imovelMatricula || ''}`);
        doc.moveDown(1);
        
        doc.fontSize(11).text('CONDIÇÕES DA VENDA:', { underline: true });
        doc.fontSize(10).text(`Valor de Venda: ${valorVendaFormatado}`);
        doc.text(`Comissão de Corretagem: ${comissaoPct || '0'}% sobre o valor da venda.`);
        doc.text(`Validade desta Autorização: ${prazoDias || '0'} dias a contar desta data.`);
        doc.moveDown(2);

        const textoPrincipal = `Pela presente, o(a) PROPRIETÁRIO(A) acima qualificado(a) autoriza a CORRETORA contratada, a promover a venda do imóvel de sua propriedade, nas condições acima estipuladas, obrigando-se a pagar a comissão de corretagem no percentual fixado, mesmo que a venda se realize após o vencimento do prazo, mas por intermédio de comprador apresentado pela corretora.`;
        
        doc.fontSize(10).text(textoPrincipal, { align: 'justify' });
        doc.moveDown(3);

        doc.text(`Cidade (Estado), ${dataHoje}.`);
        doc.moveDown(2);

        doc.text('________________________________________', { align: 'center' });
        doc.text(proprietarioNome || '', { align: 'center' });
        doc.text(proprietarioDoc || '', { align: 'center' });

        // --- 5. Finaliza o PDF ---
        doc.end();

    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao gerar PDF: ' + error.message);
    }
}
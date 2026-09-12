const pdfMake = require('pdfmake/build/pdfmake')
const pdfFonts = require('pdfmake/build/vfs_fonts')
pdfMake.vfs = pdfFonts

import { TDocumentDefinitions } from 'pdfmake/interfaces'

export async function generateStudentReportPdf(data: any): Promise<Buffer> {
  const docDefinition: TDocumentDefinitions = {
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
      lineHeight: 1.2
    },
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [40, 60, 40, 60],
    header: (currentPage, pageCount) => {
      return {
        text: `Laporan Perkembangan Santri - ${data.studentName} - Halaman ${currentPage} / ${pageCount}`,
        alignment: 'right',
        fontSize: 8,
        color: '#666666',
        margin: [40, 20, 40, 0]
      }
    },
    footer: (currentPage, pageCount) => {
      return {
        text: `Dicetak pada: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
        alignment: 'left',
        fontSize: 8,
        color: '#666666',
        margin: [40, 20, 40, 0]
      }
    },
    content: [
      {
        text: 'YAYASAN MAHABBAH QUR\'AN',
        style: 'headerTitle'
      },
      {
        text: 'LAPORAN PERKEMBANGAN BELAJAR SANTRI',
        style: 'headerSubtitle',
        margin: [0, 0, 0, 20]
      },
      
      // Identitas
      { text: 'IDENTITAS SANTRI', style: 'sectionHeader' },
      {
        layout: 'noBorders',
        table: {
          widths: [100, 'auto', '*'],
          body: [
            ['Nama Lengkap', ':', { text: data.studentName, bold: true }],
            ['Nama Panggilan', ':', data.nickname || '-'],
            ['Kelas', ':', data.className],
            ['Periode Laporan', ':', new Date(data.reportDate).toLocaleDateString('id-ID')],
          ]
        },
        margin: [0, 0, 0, 15]
      },

      // Kehadiran
      { text: 'KEHADIRAN', style: 'sectionHeader' },
      {
        layout: 'lightHorizontalLines',
        table: {
          headerRows: 1,
          widths: ['*', '*', '*', '*'],
          body: [
            [
              { text: 'Hadir', bold: true, fillColor: '#f3f4f6' },
              { text: 'Izin', bold: true, fillColor: '#f3f4f6' },
              { text: 'Sakit', bold: true, fillColor: '#f3f4f6' },
              { text: 'Alfa', bold: true, fillColor: '#f3f4f6' }
            ],
            [
              data.attendance.hadir.toString(),
              data.attendance.izin.toString(),
              data.attendance.sakit.toString(),
              data.attendance.alfa.toString()
            ]
          ]
        },
        margin: [0, 0, 0, 15]
      },

      // Hafalan
      { text: 'HAFALAN TERAKHIR', style: 'sectionHeader' },
      data.hafalan ? {
        layout: 'lightHorizontalLines',
        table: {
          headerRows: 1,
          widths: ['*', '*', '*', '*'],
          body: [
            [
              { text: 'Surah', bold: true, fillColor: '#f3f4f6' },
              { text: 'Ayat', bold: true, fillColor: '#f3f4f6' },
              { text: 'Jenis', bold: true, fillColor: '#f3f4f6' },
              { text: 'Nilai', bold: true, fillColor: '#f3f4f6' }
            ],
            [
              data.hafalan.surahName,
              `${data.hafalan.ayahStart} - ${data.hafalan.ayahEnd}`,
              data.hafalan.type === 'hafalan_baru' ? 'Hafalan Baru' : 'Muraja\'ah',
              data.hafalan.score?.toString() || '-'
            ]
          ]
        },
        margin: [0, 0, 0, 15]
      } : { text: 'Belum ada data hafalan.', italics: true, color: 'gray', margin: [0, 0, 0, 15] },

      // Tahsin
      { text: 'TAHSIN', style: 'sectionHeader' },
      data.tahsin ? {
        layout: 'lightHorizontalLines',
        table: {
          headerRows: 1,
          widths: ['*', '*', '*', '*'],
          body: [
            [
              { text: 'Makhraj', bold: true, fillColor: '#f3f4f6' },
              { text: 'Tajwid', bold: true, fillColor: '#f3f4f6' },
              { text: 'Kelancaran', bold: true, fillColor: '#f3f4f6' },
              { text: 'Ghunnah', bold: true, fillColor: '#f3f4f6' }
            ],
            [
              data.tahsin.makhrajScore?.toString() || '-',
              data.tahsin.tajwidScore?.toString() || '-',
              data.tahsin.kelancaranScore?.toString() || '-',
              data.tahsin.ghunnahScore?.toString() || '-'
            ]
          ]
        },
        margin: [0, 0, 0, 15]
      } : { text: 'Belum ada data tahsin.', italics: true, color: 'gray', margin: [0, 0, 0, 15] },

      // Penilaian
      { text: 'PENILAIAN AKHIR', style: 'sectionHeader' },
      {
        layout: 'lightHorizontalLines',
        table: {
          headerRows: 1,
          widths: ['*', '*', '*'],
          body: [
            [
              { text: 'Nilai Hafalan', bold: true, fillColor: '#f3f4f6' },
              { text: 'Nilai Tahsin', bold: true, fillColor: '#f3f4f6' },
              { text: 'Nilai Adab', bold: true, fillColor: '#f3f4f6' }
            ],
            [
              data.report.hafalanScore?.toString() || '-',
              data.report.tahsinScore?.toString() || '-',
              data.report.adabScore?.toString() || '-'
            ]
          ]
        },
        margin: [0, 0, 0, 15]
      },

      // Catatan Guru
      { text: 'CATATAN GURU', style: 'sectionHeader' },
      {
        text: data.report.teacherNotes || 'Tidak ada catatan.',
        italics: !data.report.teacherNotes,
        color: !data.report.teacherNotes ? 'gray' : 'black',
        margin: [0, 0, 0, 15]
      },

      // Catatan AI
      ...(data.report.aiParentAdvice ? [
        { text: 'SARAN UNTUK ORANG TUA', style: 'sectionHeader' } as any,
        {
          text: data.report.aiParentAdvice,
          margin: [0, 0, 0, 15]
        }
      ] : [])
    ],
    styles: {
      headerTitle: {
        fontSize: 16,
        bold: true,
        alignment: 'center',
        color: '#4B21A2'
      },
      headerSubtitle: {
        fontSize: 12,
        bold: true,
        alignment: 'center',
        color: '#333333'
      },
      sectionHeader: {
        fontSize: 12,
        bold: true,
        color: '#4B21A2',
        margin: [0, 10, 0, 5],
        decoration: 'underline'
      }
    }
  }

  const doc = pdfMake.createPdf(docDefinition)
  return await doc.getBuffer()
}

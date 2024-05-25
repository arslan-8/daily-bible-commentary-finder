import { NextResponse } from "next/server";

const WordExtractor = require("word-extractor");
const extractor = new WordExtractor();

export async function POST(req: Request) {
  try {

    let formData

    try { formData = await req?.formData(); 
    } catch (err: any) {
      return NextResponse.json({ success: false, message: "Please upload both files 'newFile' and 'oldFiles' in form-data" }, { status: 400 }); 
    }

    const oldFiles = formData?.getAll('oldFiles') as File[];
    const newFile = formData?.get('newFile') as File;    

    if (!newFile || !newFile?.name) return NextResponse.json({ success: false, message: "Please upload 'newFile' in form-data" }, { status: 400 });
    if (!oldFiles.length || !oldFiles[0]?.name) return NextResponse.json({ success: false, message: "Please upload one or more 'oldFiles' in form-data" }, { status: 400 });
    
    // let oldFilesContent: any[] = [];
    let oldFilesExtractedData: ExtractedData[] = [];
    let failedExtractedData: ExtractedData[] = [];

    for (const file of oldFiles) {
      const content = await readUploadedFile(file);
      const extractedData = getDataFromText(content, file.name, failedExtractedData);
      oldFilesExtractedData.push(...extractedData);
    }

    const newFileContent = await readUploadedFile(newFile);
    const newFileExtractedData: ExtractedData[] = getDataFromText(newFileContent, newFile.name, failedExtractedData);

    const matchingPassages = await findMatchingBiblicalPassages(oldFilesExtractedData, newFileExtractedData);

    // if (matchingPassages.length === 0) return NextResponse.json({ success: false, message: "Not found any matching biblical passage" }, { status: 404 });

    return NextResponse.json({ success: true, data: { matched: matchingPassages, failed: failedExtractedData }}, { status: 200 });
  } catch (err: any) {
    console.log("error --> ", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

interface ExtractedData {
  date: string;
  biblicalPassage: string;
  text: string;
  fileName: string;
}

interface MatchingPassageContent {
  date: string;
  text: string;
  fileName: string;
}

interface FindMatchingBiblicalPassagesRes {
  biblicalPassage: string;
  matchingPassageContent: MatchingPassageContent[];
}


async function findMatchingBiblicalPassages(
  oldFilesExtractedData: ExtractedData[],
  newFileExtractedData: ExtractedData[]
): Promise<FindMatchingBiblicalPassagesRes[]> {
  const result: FindMatchingBiblicalPassagesRes[] = [];
  const passageMap: Record<string, MatchingPassageContent[]> = {};

  for (const newFile of newFileExtractedData) {
    const matchingContentNew = {
      fileName: newFile.fileName,
      date: newFile.date,
      text: newFile.text,
    };

    for (const oldFile of oldFilesExtractedData) {
      if (newFile.biblicalPassage === oldFile.biblicalPassage) {
        const matchingContentOld = {
          fileName: oldFile.fileName,
          date: oldFile.date,
          text: oldFile.text,
        };

        if (passageMap[newFile.biblicalPassage]) {
          passageMap[newFile.biblicalPassage].push(matchingContentOld);
        } else {
          passageMap[newFile.biblicalPassage] = [matchingContentNew, matchingContentOld];
        }
      }
    }
  }

  // Convert the map to the result array
  for (const [biblicalPassage, matchingPassageContent] of Object.entries(passageMap)) {
    result.push({ biblicalPassage, matchingPassageContent });
  }

  return result;
}


// async function findMatchingBiblicalPassages(
//   oldFilesExtractedData: ExtractedData[],
//   newFileExtractedData: ExtractedData[]
// ): Promise<FindMatchingBiblicalPassagesRes[]> {
//   const result: FindMatchingBiblicalPassagesRes[] = [];

//   // Create an array of promises for concurrent execution
//   const promises: Promise<void>[] = [];

//   for (const oldFile of oldFilesExtractedData) {
//     for (const newFile of newFileExtractedData) {
//       // Push a promise for each comparison operation
//       promises.push(new Promise<void>((resolve) => {
//         if (newFile.biblicalPassage === oldFile.biblicalPassage) {
//           const matchingContentNew = {
//             fileName: newFile.fileName,
//             date: newFile.date,
//             text: newFile.text
//           };

//           const matchingContentOld = {
//             fileName: oldFile.fileName,
//             date: oldFile.date,
//             text: oldFile.text
//           };

//           // Find the existing entry in the result array
//           const existingEntry = result.find(
//             entry => entry.biblicalPassage === newFile.biblicalPassage
//           );

//           if (existingEntry) {
//             existingEntry.matchingPassageContent.push(matchingContentOld);
//           } else {
//             // Create a new entry if it doesn't exist
//             result.push({
//               biblicalPassage: newFile.biblicalPassage,
//               matchingPassageContent: [matchingContentNew, matchingContentOld]
//             });
//           }
//         }
//         resolve();
//       }));
//     }
//   }

//   // Await all promises concurrently
//   await Promise.all(promises);
//   return result;
// }


async function readUploadedFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  
  if (file.name.endsWith('.txt')) {
    return buffer.toString('utf8');
  } else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
    const extracted = await extractor.extract(buffer);
    return extracted.getBody();
  } else {
    throw new Error('Unsupported file type');
  }
}


function getDataFromText(text: string, fileName: string, failedExtractedData: ExtractedData[]): ExtractedData[] {
  
  // Define the regex pattern for dates
  const datePattern = /(Domenica|Lunedì|Martedì|Mercoledì|Giovedì|Venerdì|Sabato)(?: Santo)? \d{1,2} (novembre|dicembre|gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)/g;

  // Find all the dates in the text
  const dates = text.match(datePattern);
  
  // if (!dates) return [];

  // Split the text based on the dates
  const splitText = text.split(datePattern);

  // Create result array of objects which contains 'date', 'biblical passage' and the whole text of the day

  // Prepare the result array
  const extractedData: ExtractedData[] = [];

  let j = 0;
  
  for (let i = 1; i < splitText.length; i++) {
    // const dateStr = `${splitText[i].trim()} ${splitText[i+1].trim()}`;
    let date = ""
    if (dates) date = dates[j];
    
    const text = `${date}${splitText[i+2]}`;
    const biblicalPassage = findBiblicalPassages(text)

    if (date === "" || biblicalPassage === "") {
      failedExtractedData.push({ date, biblicalPassage, text, fileName });
    }
    else {
      extractedData.push({ date, biblicalPassage, text, fileName });
    }
    
    i += 2;
    j++;
  }

  return extractedData;
}

function findBiblicalPassages(text: string): string {
  const bookNames = [
    "Genesi", "Esodo", "Levitico", "Numeri", "Deuteronomio", "Giosuè", "Giudici", "Rut", "Primo libro di Samuele", "Secondo libro di Samuele",
    "Primo libro dei Re", "Secondo libro dei Re", "Primo libro delle Cronache", "Secondo libro delle Cronache", "Esdra", "Neemia", "Tobia",
    "Giuditta", "Ester", "Primo libro dei Maccabei", "Secondo libro dei Maccabei", "Giobbe", "Salmi", "Proverbi", "Qoelet", "Cantico dei Cantici",
    "Sapienza", "Siracide", "Isaia", "Geremia", "Lamentazioni", "Baruc", "Ezechiele", "Daniele", "Osea", "Gioele", "Amos", "Abdia", "Giona",
    "Michea", "Naum", "Abacuc", "Sofonia", "Aggeo", "Zaccaria", "Malachia", "Matteo", "Marco", "Luca", "Giovanni", "Atti degli Apostoli",
    "Lettera ai Romani", "Prima lettera ai Corinzi", "Seconda lettera ai Corinzi", "Lettera ai Galati", "Lettera agli Efesini", "Lettera ai Filippesi",
    "Lettera ai Colossesi", "Prima lettera ai Tessalonicesi", "Seconda lettera ai Tessalonicesi", "Prima lettera a Timoteo", "Seconda lettera a Timoteo",
    "Lettera a Tito", "Lettera a Filemone", "Lettera agli Ebrei", "Lettera di Giacomo", "Prima lettera di Pietro", "Seconda lettera di Pietro",
    "Prima lettera di Giovanni", "Seconda lettera di Giovanni", "Terza lettera di Giovanni", "Lettera di Giuda", "Apocalisse di Giovanni",
    "Gen", "Es", "Lv", "Nm", "Dt", "Gs", "Gdc", "Rt", "1Sam", "2Sam", "1Re", "2Re", "1Cr", "2Cr", "Esd", "Ne", "Tb", "Gdt", "Est", "1Mac", "2Mac",
    "Gb", "Sal", "Pr", "Qo", "Ct", "Sap", "Sir", "Is", "Ger", "Lam", "Bar", "Ez", "Dn", "Os", "Gl", "Am", "Abd", "Gn", "Mic", "Na", "Ab", "Sof", "Ag",
    "Zc", "Ml", "Mt", "Mc", "Lc", "Gv", "At", "Rm", "1Cor", "2Cor", "Gal", "Ef", "Fil", "Col", "1Ts", "2Ts", "1Tm", "2Tm", "Tt", "Fm", "Eb", "Gc",
    "1Pt", "2Pt", "1Gv", "2Gv", "3Gv", "Gd", "Ap", "1 Sam", "2 Sam", "1 Re", "2 Re", "1 Cr", "2 Cr", "1 Mac", "2 Mac", "1 Cor", "2 Cor", "1 Ts",
    "2 Ts", "1 Tm", "2 Tm", "1 Pt", "2 Pt", "1 Gv", "2 Gv", "3 Gv", "Genesi", "Esodo", "Levitico", "Numeri", "Deuteronomio", "Giosuè", "Giudici",
    "Rut", "1Samuele", "2Samuele", "1Re", "2Re", "1Cronache", "2Cronache", "Esdra", "Neemia", "Tobia", "Giuditta", "Ester", "1Maccabei", "2Maccabei",
    "Giobbe", "Salmi", "Proverbi", "Qoelet", "Cantico", "Sapienza", "Siracide", "Isaia", "Geremia", "Lamentazioni", "Baruc", "Ezechiele", "Daniele",
    "Osea", "Gioele", "Amos", "Abdia", "Giona", "Michea", "Naum", "Abacuc", "Sofonia", "Aggeo", "Zaccaria", "Malachia", "Matteo", "Marco", "Luca",
    "Giovanni", "Atti", "Romani", "1Corinzi", "2Corinzi", "Galati", "Efesini", "Filippesi", "Colossesi", "1Tessalonicesi", "2Tessalonicesi", "1Timoteo",
    "2Timoteo", "Tito", "Filemone", "Ebrei", "Giacomo", "1Pietro", "2Pietro", "1Giovanni", "2Giovanni", "3Giovanni", "Giuda", "Apocalisse", "1 Samuele",
    "2 Samuele", "1 Re", "2 Re", "1 Cronache", "2 Cronache", "1 Maccabei", "2 Maccabei", "1 Corinzi", "2 Corinzi", "1 Tessalonicesi", "2 Tessalonicesi",
    "1 Timoteo", "2 Timoteo", "1 Pietro", "2 Pietro", "1 Giovanni", "2 Giovanni", "3 Giovanni", "Qoèlet", "Salmo", "Num"
  ];

  const bookPattern = bookNames.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  // const regexPattern1 = /\w+\s\d[\w\d,.\-(); ]*;\s\w+\s\d[\w\d,.\-(); ]*;\s\w+\s\d[\w\d,.\-(); ]*;\s\w+\s\d[\w\d,.\-(); ]*/g;
  const regexPattern1 = new RegExp(
      `(${bookPattern})\\s\\d[\\w\\d,.\\-(); ]*;\\s(${bookPattern})\\s\\d[\\w\\d,.\\-(); ]*;\\s(${bookPattern})\\s\\d[\\w\\d,.\\-(); ]*;\\s(${bookPattern})\\s\\d[\\w\\d,.\\-();° ]*(?=\\s|$|\\.|$)`,
      'gm'
  );
  // const regexPattern2 = new RegExp(`\\b(?:${bookPattern})\\s+\\d+,\\d+[-,\\d\\.]*\\b`, 'g');
  const regexPattern2 = new RegExp(`\\b(?:${bookPattern})\\s*,?\\s*\\d+[-,\\d]*[a-z]*\\s*(?:\\(\\d+\\))?\\b`, 'g');


  let result = '';
  let match;
  while ((match = regexPattern1.exec(text)) !== null) {
    result = match[0].replace(/[.;\s°]*$/, '');
    break;
  }

  if (result === '') {
    while ((match = regexPattern2.exec(text)) !== null) {
      result = match[0].replace(/[.;\s°]*$/, '');
      break;
    }
  }
  
  return result;
}
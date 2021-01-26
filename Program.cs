using Parser;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;

namespace Parser
{
    class Program
    {
        //Alte Überschrift
        //static String headingold = "ORI_NR;ORI_MVA;ORI_NAME;ORI_DRAWINGNR;ORI_QUANTITYCALCULATED;ORI_POSUNITCALCPRICE;ORI_POSSUMWEIGHT;ORI_REMARK;ORI_DATE";

        //Neue Überschrift wird am Anfang des Files geschrieben
        static String heading = "ORI_NR;LIST;ORI_MVA;TOP_POSITION;ORI_NAME;ORI_DRAWINGNR;ORI_QUANTITYCALCULATED;TOTAL_QUANTITY;LENGHT;UNIT;ORI_POSUNITCALCPRICE;ORI_POSSUMWEIGHT;TYPE;ORI_REMARK;ORI_DATE";
        //Erstellt eine Liste an Positionen.
        static List<Position> positions = new List<Position>();
        //Zweite Liste an Positionen die für die Sortierung verwendet wird.
        static List<Position> printQueue = new List<Position>();

        //Ausgangspfad für die Filesuche (Standartmässig, im Aktuellen verzeichniss)
        static String basePath = Directory.GetCurrentDirectory();

        //File-Locations werden im Debugmode überschrieben
        static String outputFile;
        static String outputFolder;
        static String inputFile;
        static String inputFolder;
        static String inputFolderPDF;
        static String positionsTextOption;

        static Stopwatch st;

        static string[] configText = new string[9];
        static NumberFormatInfo provider;

        static void Main(string[] args)
        {
            Console.WriteLine("Das Programm wurde gestartet");

            st = new Stopwatch(); // Starten eines Timers
            st.Start();

            //Überprüfung ob bereits eine .conf Datei existiert
            if (!File.Exists(basePath + @"\Parser.conf"))
            {
                Console.WriteLine("Optionen für Positionstext:");
                Console.WriteLine("(0) Alles");
                Console.WriteLine("(1) Nur Erste Zeile");

                string status = "";
                do
                {
                    string text = Console.ReadLine();
                    switch (text)
                    {
                        case "0":
                        case "1":
                            status = text;
                            break;
                        default:
                            break;
                    }
                } while (status == "");

                //Wenn nein dan wird eine neue Datei angelegt
                using (StreamWriter file = new StreamWriter(basePath + @"\Parser.conf"))
                {
                    //Standart Content der Conf Datei
                    file.WriteLine(@"Geben sie hier die Benötigten File Pfade an. Verwenden sie %P für den aktuellen Pfad z.B.: BestellungsPfad = %P\Bestellung.txt");
                    file.WriteLine("");
                    file.WriteLine("Bestellungs Pfad = %P\\Bestellung.txt   # Der Pfad der Bestellungs Datei");
                    file.WriteLine("Input Ordner Pfad = %P\\Out             # Der Pfad des Ordners in dem sich alle convertierten Positionen befinden");
                    file.WriteLine("Input PDF Ordner Pfad = %P\\In          # Der Pfad des Ordners in dem sich alle orginalen Positionen befinden");
                    file.WriteLine("Output File Pfad = %P\\Output.txt       # Der Pfad an den das fertige File geschrieben wird");
                    file.WriteLine("Output Ordner Pfad = %P\\OutputList     # Der Pfad des Ordners in dem die Strucktur der Stückliste dargestellt wird");
                    file.WriteLine("Positionstext der Bestellung = " + status + "          # Optionen für das Einlesen des Positionstexts der Bestellung");
                    file.WriteLine("");
                    file.WriteLine("Sollten Sie dieses Programm in einen anderen Ordner verschieben. So sollten Sie auch diese Konfigurations Datei verschieben");
                }
                //Nach dem Erstellen der Datei muss das Programm neu gestartet werden
                Console.WriteLine("Setup abgeschlossen. Es wurde eine Konfigurations Datei erstellt. Drücken sie ENTER um das Programm zu beenden und starten sie es erneut.");
                Console.ReadLine();
                Environment.Exit(1);
            }
            else
            {
                // Wenn die .conf Datei bereits existiert wird sie Ausgelesen
                configText = File.ReadAllLines(basePath + @"\Parser.conf");
                inputFile = configText[2].Split('=')[1].Split('#')[0].Replace("%P", basePath).Trim();
                inputFolder = configText[3].Split('=')[1].Split('#')[0].Replace("%P", basePath).Trim();
                inputFolderPDF = configText[4].Split('=')[1].Split('#')[0].Replace("%P", basePath).Trim();
                outputFile = configText[5].Split('=')[1].Split('#')[0].Replace("%P", basePath).Trim();
                outputFolder = configText[6].Split('=')[1].Split('#')[0].Replace("%P", basePath).Trim();
                positionsTextOption = configText[7].Split('=')[1].Split('#')[0].Trim();
            }

            //Formatierung für das Konvertiern von String zu Double
            provider = new NumberFormatInfo();
            provider.NumberDecimalSeparator = ",";
            provider.NumberGroupSeparator = ".";
            provider.NumberGroupSizes = new int[] { 3 };

            //Importierung der Bestellungs Datei
            ImportInvoice(inputFile);

            //Importierung von allen Stücklisten files, diese werden ungeordnet in eine Liste geschrieben
            List<Position> unordnedList = new List<Position>(ImportThePositions());

            //Die Positionen werden in eine Baumstrucktur gebracht und die benötigte Gesamtmenge für alle Positionen wird berechnet
            foreach (Position p in positions)
            {
                p.FindChildren(unordnedList);
                p.CalculateNumber(p.artNr);

            }

            //Spiegelteil Erkennung
            foreach (Position p in positions)
            {
                //p.DetectMirror(unList);
                p.DetectMirrorSibling(positions);
            }

            //Alle Positionen aus der Bestellung werden der Reihe nach in eine neue Liste (printQueue) geschrieben (Dies sind die Elemente der höchsten Ebene)
            printQueue.AddRange(positions);

            //Zwei neue temporäre Listen werden erstellt, diese helfen beim sortieren
            List<Position> tempQueue1 = new List<Position>();
            List<Position> tempQueue2 = new List<Position>();
            //tQ1 wird mit printQueue gefüllt.
            tempQueue1.AddRange(printQueue);

            //Solange innerhalb von tQ1 noch Positionen sind wird dieser Code ausgeführt
            //Alle Kinderelemente der Elementen in tQ1 werden tQ2 hinzugefügt. (Beim ersten Mal werden die Kinder von allen Elementen der ersten Ebene(tQ1) tQ2 hinzugefügt -> in tQ2 sind jetzt alle Elemente der zweiten Ebene)
            //Alle Elemente dieser Ebene wird an printQueue angehängt -> Bei jeder Iteration der while-schleife werden alle Elmente einer Ebene an printQueue angehängt
            //tQ1 wird geleert und mit tQ2 gefüllt
            //tQ2 wird geleert
            //Wenn diese Sortier-Schleife abgeschlossen ist haben wir eine Liste in der Alle ebenen hintereinander stehen (1, 2, 3, 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 1.1.1, 1.1.2)
            do
            {
                foreach (Position p in tempQueue1)
                {
                    tempQueue2.AddRange(p.GetChildren());
                }
                printQueue.AddRange(tempQueue2);
                tempQueue1.Clear();
                tempQueue1.AddRange(tempQueue2);
                tempQueue2.Clear();
            } while (tempQueue1.Count > 0);

            //Neues Outputfile wird erstellt und die Überschrift wird eingefügt -> dies überschreibt andere Files die den gleichen Namen haben
            using (StreamWriter file = new StreamWriter(outputFile))
            {
                file.WriteLine(heading);
            }
            //Die Liste Printqueue wird in das File geschrieben
            StreamWriter sw = new StreamWriter(outputFile, true);
            sw.AutoFlush = true;
            foreach (Position p in printQueue)
            {
                sw.WriteLine(p.ReturnLine());
            }

            if (Directory.Exists(inputFolderPDF))
            {
                //Der Output Folder wird erstellt - Sollte schon ein Folder mit der gleichen Bezeichnung vorhanden sein wird dieser gelöscht
                if (Directory.Exists(outputFolder))
                {
                    Directory.Delete(outputFolder, true);
                }
                //Der Folder wird mit untergeordneten Foldern und Files gefüllt

                foreach (Position p in positions)
                {
                    string outFolder = outputFolder + @"\ID" + " " + p.artNr;
                    if (!Directory.Exists(outFolder))
                    {
                        Directory.CreateDirectory(outFolder);
                    }
                    p.CreateFolderStructure(p.artNr, outFolder, inputFolderPDF);
                }
            }

            // Ende des Programms

            st.Stop();

            Console.WriteLine("Das Programm wurde beendet. Drücken sie ENTER um die Konsole zu schließen.");

            Console.ReadLine();
        }

        static void ImportInvoice(string inputFile)
        {
            //Die Bestellungs Datei wird ausgelesen wenn die Datei nicht gefunden wird, wird das Programm geschlossen
            string fileText = "";
            try
            {
                fileText = File.ReadAllText(inputFile);
            }
            catch (Exception)
            {
                Console.Write("");
                Console.WriteLine("Die Bestellungsdatei wurde nicht gefunden");
                Console.Write("");
                Console.WriteLine("Der erwartete Pfad ist : {0}", inputFile);
                Console.WriteLine("Drücken Sie ENTER um das Programm zu beenden und überprüfen sie ihre Konfigurationsdatei");
                Console.ReadLine();
                System.Environment.Exit(1);
                throw;
            }

            //Der gesamte Text wird in kleine Teile geteilt. Immer wenn mindestens 4 . Symbole Auftreten.
            string[] parts = Regex.Split(fileText, @"\.\.\.\.\.\.\.\.+\s*");

            //Beim ersten Teil wird alles vor der ersten Positionsnummer gelöscht
            parts[0] = Regex.Match(parts[0], @"[0-9]+\/[0-9]+\s+[0-9]+\s+[\s\S]*").ToString();
            for (int i = 0; i < parts.Length; i++)
            {
                //Die Seitenumbrüche werden aus jedem Teil gelöscht (Alles von "Bank für Tirol" bis "Ihre Artikelbezeichnung")
                parts[i] = Regex.Replace(parts[i], @"\s*Bank für Tirol[\S\s]+Nettobetrag", "");

            }
            //Im Letzten Teil wird noch alles Extrige das danach kommt gelöscht
            parts[parts.Length - 1] = Regex.Replace(Regex.Replace(parts[parts.Length - 1], @"[\s\n]+Bank[\s\S]+", ""), @"[\s\n]*Gesamtbetrag[\s\S]+", "");

            //In jedem Index von parts ist jetzt ein Teil der Bestellung ohne unnötiges anderes
            //Der Liste positions wird jetzt für jeden Teil der Bestellung eine Position hinzugefügt
            foreach (string s in parts)
            {
                if (!string.IsNullOrEmpty(s))
                {
                    positions.Add(ParseInvoicePart(s));
                }
            }
        }

        static Position ParseInvoicePart(string text)
        {
            //Zuerst wird die Schrift auf der Rechten Seite entfernt
            text = Regex.Replace(text, @"    *[A-z:_] ", "");

            text = Regex.Replace(text, @"^[A-z:_]", "");

            text = text.TrimStart();

            //Hier die Auswahl meherer Variablen aus dem Text
            string posNr = Regex.Match(text, @"[0-9/]+").ToString();

            //if (string.IsNullOrEmpty(posNr))
            //{
            //    return null;
            //}

            posNr = Regex.Replace(posNr, @";", ",");
            string artNr = Regex.Match(text, @"(?<=([0-9]+\/[0-9]+\s+))[0-9]+").ToString();
            artNr = Regex.Replace(artNr, @";", ",");
            string name = Regex.Match(text, @"[A-z].+?(?=[0-9.]+,[0-9][0-9]\s+[A-z]+\s+[0-9.]+,[0-9][0-9]\s+\/)+").ToString();
            name = Regex.Replace(name, @";", ",");
            //Der Text wird in Zeilen geteilt
            string[] tempLines = text.Split('\n');
            string[] lines;
            if (Regex.IsMatch(tempLines[0], @"[A-z:_]\s+$"))
            {
                lines = new string[tempLines.Length - 1];
                for (int i = 0; i < tempLines.Length - 1; i++)
                {
                    lines[i] = tempLines[i + 1];
                }
            }
            else
            {
                lines = tempLines;
            }

            string rest = Regex.Split(lines[0], @"\s+(?=[0-9.]+,[0-9][0-9]\s+[A-z]+\s+[0-9.]+,[0-9][0-9]\s+\/)")[1];

            //Die Zeilen werden immer geteilt wenn mehrere " " aufeinander folgen
            string[] fields = Regex.Split(rest, @"  +");

            //Auswahl der Restlichen Variablen 
            string price = Regex.Match(fields[2], @"[0-9.]+,[0-9]+").ToString();
            price = price.Replace(".", "");
            price = Regex.Replace(price, @";", ",");

            string date = "";
            string drawing = "";
            string remark = "";

            //Es wird über alle Zeilen iterriert und dabei wird nach dem Datum und der Zeichnungsnummer gesucht (Sollten beide in dieser Zeile nicht vorkommen so wird diese Zeile der Beschreibung hinzugefügt)
            for (int j = 1; j < lines.Length; j++)
            {
                string ltemp = Regex.Match(lines[j], @"(?<=(Lieferdatum\s+))\S.+").ToString();
                string dtemp = Regex.Match(lines[j], @"(?<=(Zeichnungs Nr.\s+))\S.+").ToString();
                if (ltemp != "")
                {
                    date = ltemp;
                }
                else if (dtemp != "")
                {
                    drawing = dtemp;
                }
                else if (lines[j].Trim() != "")
                {
                    switch (positionsTextOption)
                    {
                        case "0":
                            remark += lines[j].Trim();
                            remark += @"\n";
                            break;
                        case "1":
                        default:
                            if (remark == "")
                            {
                                remark += lines[j].Trim();
                                remark += @"\n";
                            }
                            break;
                    }
                }
            }
            date = Regex.Replace(date, @";", ",");
            drawing = Regex.Replace(drawing, @";", ",");
            remark = Regex.Replace(remark, @";", ",");

            //Rückgabe einer neuen Position die mit allen gefunden Variablen inizialisert wird
            return new Position(posNr, artNr, name, Convert.ToDouble(fields[0], provider), price, Regex.Replace(fields[1], @";", ","), date, drawing, remark);
        }


        static List<Position> ImportThePositions()
        {
            List<Position> positions = new List<Position>();
            //Alle Files die einen 8-Zeichen langen Namen und eine Endung auf .txt haben werden importiert
            string[] txtFiles = Directory.EnumerateFiles(inputFolder, "????????.txt").ToArray<string>();
            for (int i = 0; i < txtFiles.Length; i++)
            {
                string text = File.ReadAllText(txtFiles[i]);
                string list = Regex.Match(text, @"(?<=(Seite:\s+[0-9]\s+[A-Z]\s+))[0-9]+").ToString();

                if (list != "")
                {
                    string[] temp = Regex.Split(text, @"Ges.Gewicht\s+");

                    temp = Regex.Split(temp[1], @"\s+EndederKonstruktionsrevisionBaukasten-Stücklisten-Info[\s\S]+");
                    temp = Regex.Split(temp[0], @"\s+Gesamtgewicht[\s\S]+");
                    /*
                    temp = Regex.Split(temp[0], @"Artikelgewichtfehlt!!!");
                    temp = Regex.Split(temp[0], @"M.\s*BESCHEINIGUNG");
                    temp = Regex.Split(temp[0], @"SONDERANFORDERUNGEN");
                    temp = Regex.Split(temp[0], @"A L T E R N A T I V:");
                    temp = Regex.Split(temp[0], @"LIEFERZUSTAND");
                    temp = Regex.Split(temp[0], @"100*,00000*");
                    temp = Regex.Split(temp[0], @"HFCHS NACH");
                    temp = Regex.Split(temp[0], @"Druckdaten");
                    */
                    string[] block = Regex.Split(temp[0], @"\s+?(?=[0-9]+[A-Z]+\s+[0-9]+\s+R)");


                    foreach (string s in block)
                    {
                        positions.Add(ReadOneBlock(s, list));
                    }
                }
            }
            return positions;
        }

        static Position ReadOneBlock(string text, string list)
        {
            string posNr = Regex.Match(text, @"[0-9]+").ToString();
            string artNr = Regex.Match(text, @"(?<=([0-9]+[A-Z]\s+))[0-9]+").ToString();
            string name = "";
            string drawing = "";
            double quantity = Convert.ToDouble(Regex.Match(text, @"[0-9.]+,[0-9]+").ToString(), provider);
            string price = "";
            string unit = Regex.Match(text, @"(?<=([0-9.]+,[0-9]+\s*))[A-z]+").ToString();
            string date = "";
            string[] lines = text.Split('\n');
            string remark = "";
            string weight = "";
            for (int i = 0; i < lines.Length; i++)
            {
                Regex cutEnding = new Regex(@"\s+[A-z:_]\s*$");
                lines[i] = cutEnding.Replace(lines[i], "");
                cutEnding = new Regex(@"(?<=([0-9]))[A-z:_]\s*$");
                lines[i] = cutEnding.Replace(lines[i], "");
                switch (i)
                {
                    case 0:
                        weight = Regex.Match(lines[i], @"([0-9.]+,[0-9]+)?(?=(\s+[0-9.]+,[0-9]+\s+$))").ToString();
                        name = Regex.Match(lines[i], @"(?<=([0-9.]+,+[0-9]+\s*[A-z]+\s+)).+?(?=\s+[0-9.]+,[0-9]+\s+[0-9.]+,[0-9]+\s*$)").ToString();
                        drawing = Regex.Match(name, @"[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][A-Z]+[0-9][0-9][0-9][0-9][0-9][0-9][.]*[A-Z]*$").ToString();
                        if (drawing != "")
                        {
                            name = name.Replace(drawing, "");
                        }
                        break;
                    default:
                        string[] pieces = Regex.Split(lines[i], @"   +");
                        foreach (string s in pieces)
                        {
                            if (s.Length >= 8)
                            {
                                String t = Regex.Replace(s, @"\s*SIEHE\s*STUECKLISTE\s*", "");
                                t = t.Trim();
                                t = Regex.Replace(t, @"^[0-9.]+,[0-9]+$", "");
                                if (t != "")
                                {
                                    if (remark == "")
                                    {
                                        remark += t;
                                    }
                                    else
                                    {
                                        remark += @"\n" + t;
                                    }

                                }
                            }
                        }
                        break;
                }
            }

            return new Position(posNr, list, artNr, name, quantity, price, unit, date, drawing, remark, weight);
        }
    }
}

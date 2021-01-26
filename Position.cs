using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;

namespace Parser
{
    class Position
    {
        public string posNrConcat;
        public string posNr;
        public string artNr;
        public string name;
        public string drawingNr;
        public double quantity;
        public string price;
        public string unit;
        public string date;
        public string remark;
        public string list;
        public string weight;
        public List<Position> children;
        public string type;
        public double lenght;
        public double totalQuantity;
        public string topPosition;

        public Position(string posNr, string artNr, string bez, double quantity, string price, string unit, string date, string drawingNr, string remark)
        {
            this.posNr = posNr;
            this.posNrConcat = posNr;
            this.artNr = artNr;
            this.name = bez.Trim();
            this.quantity = quantity;
            this.price = price;
            this.unit = unit;
            this.date = date.Trim();
            this.drawingNr = drawingNr.Trim();
            if (unit == "pcs")
                this.remark = remark;
            children = new List<Position>();
            this.type = "UNSET";
            if (unit == "m")
            {
                this.lenght = quantity;
                this.quantity = 1d;
            }
            this.totalQuantity = this.quantity;
            this.topPosition = "";
        }
        public Position(string posNr, string list, string artNr, string bez, double quantity, string price, string unit, string date, string drawingNr, string remark, string weight)
        {
            this.posNr = posNr;
            this.artNr = artNr;
            this.name = bez.Trim();
            this.quantity = quantity;
            this.price = price;
            this.unit = unit;
            this.date = date.Trim();
            this.drawingNr = drawingNr.Trim();
            if (unit == "pcs")
                this.remark = remark;
            this.list = list;
            this.weight = weight;
            children = new List<Position>();
            this.type = "UNSET";
            if (unit == "m")
            {
                this.lenght = quantity;
                this.quantity = 1d;
            }
            this.topPosition = "";
        }

        public Position(Position p, string concatPosNr)
        {
            this.posNrConcat = concatPosNr;
            this.posNr = p.posNr;
            this.artNr = p.artNr;
            this.name = p.name;
            this.drawingNr = p.drawingNr;
            this.quantity = p.quantity;
            this.price = p.price;
            this.unit = p.unit;
            this.date = p.date;
            this.remark = p.remark;
            this.list = p.list;
            this.weight = p.weight;
            //this.children = p.children;
            this.children = new List<Position>();
            this.type = p.type;
            this.lenght = p.lenght;
            this.totalQuantity = p.totalQuantity;
            this.topPosition = p.topPosition;
        }

        public void Print()
        {
            Console.WriteLine(posNrConcat + ";" + list + ";" + artNr + ";" + topPosition + ";" + name + ";" + drawingNr + ";" + quantity + ";" + totalQuantity + ";" + lenght + ";" + unit + ";" + price + ";" + weight + ";" + type + ";" + remark + ";" + date);
        }

        public string ReturnLine()
        {
            return posNrConcat + ";" 
                 + list + ";"
                 + artNr + ";" 
                 + topPosition + ";" 
                 + name + ";" 
                 + drawingNr + ";" 
                 + quantity + ";" 
                 + totalQuantity + ";" 
                 + lenght + ";" 
                 + unit + ";" 
                 + price + ";" 
                 + weight + ";" 
                 + type + ";" 
                 + remark + ";" 
                 + date;
        }

        public List<Position> GetChildren()
        {
            return children;
        }

        public void FindChildren(List<Position> uList)
        {
            foreach (Position p in uList)
            {
                if (p.list == this.artNr)
                {
                    if (!this.children.Contains(p))
                    {
                        this.children.Add(new Position(p, this.posNrConcat + ("." + p.posNr)));
                    }
                }
            }

            //Setting the Type depending if the position has children

            this.type = "";

            if (this.children.Count > 0)
            {
                if (this.children.Count == 1 && this.children[0].unit == "kg")
                {
                    this.type = "Laserteil";
                }
                else
                { 
                    this.type = "Baugruppe";
                }
            }
            else
            {
                if (this.unit == "kg")
                {
                    this.type = "Blech";
                }
                else
                {
                    this.type = "Einzelteil";
                }
            }

            foreach (Position p in this.children)
            {
                p.FindChildren(uList);
            }
        }

        public void DetectMirrorSibling(List<Position> positions)
        {
            if (this.type == "Einzelteil" && (Regex.IsMatch(this.name, @".+ WG") || Regex.IsMatch(this.name, @".+ SP")))
            {
                foreach (Position p in positions)
                {
                    if (p.drawingNr == this.drawingNr && p.type == "Baugruppe")
                    {
                        this.children.AddRange(p.children);
                        this.type = "Baugruppe";

                        foreach (Position pc in children)
                        {
                            pc.list = this.artNr;
                        }
                    }
                }
            }

            //Fehlermeldung
            if (this.type == "Einzelteil" && !(Regex.IsMatch(this.name, @".+ WG") || Regex.IsMatch(this.name, @".+ SP")))
            {
                foreach (Position p in positions)
                {
                    if (p.drawingNr == this.drawingNr && p.drawingNr != "" && p.type == "Baugruppe")
                    {
                        if (posNrConcat[posNrConcat.Length-1] != '#')
                        {
                            this.posNrConcat += " #";
                        }
                    }
                }
            }

            foreach (Position p in children)
            {
                p.DetectMirrorSibling(children);
            }
        }

        public void CalculateNumber(string top)
        {
            foreach (Position p in this.children)
            {
                p.totalQuantity = p.quantity * this.totalQuantity;
                p.topPosition = top;
                p.CalculateNumber(top);
            }
        }

        
        public void CreateFolderStructure(string name, string pathOut, string pathIn)
        {
            ArrayList files = new ArrayList();
            files.AddRange(Directory.EnumerateFiles(pathIn, "*"+this.artNr+"*.*").ToList<string>());
            if (this.drawingNr != "")
            {
                files.AddRange(Directory.EnumerateFiles(pathIn, "*" + this.drawingNr + "*.*").ToList<string>());
            }

            foreach (string file in files)
            {
                string tempName = Path.GetFileName(file);

                string tempin = Path.Combine(pathIn, tempName);
                string tempout = Path.Combine(pathOut, tempName);
                File.Copy(tempin, tempout,true);
            }
            

            foreach (Position p in this.children)
            {
                p.CreateFolderStructure(name, pathOut, pathIn);
            }
        }
    }
}

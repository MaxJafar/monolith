// Release-only zip writer; no external archiving tools or install scripts.
package main

import (
	"archive/zip"
	"flag"
	"io"
	"io/fs"
	"log"
	"os"
	"path/filepath"
)

func main() {
	dir := flag.String("directory", "", "Application directory")
	destination := flag.String("output", "", "Zip output")
	flag.Parse()
	if *dir == "" || *destination == "" {
		log.Fatal("directory and output are required")
	}
	output, err := os.Create(*destination)
	if err != nil {
		log.Fatal(err)
	}
	writer := zip.NewWriter(output)
	err = filepath.WalkDir(*dir, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() {
			return nil
		}
		info, err := entry.Info()
		if err != nil {
			return err
		}
		if !info.Mode().IsRegular() {
			return &os.PathError{Op: "archive", Path: path, Err: fs.ErrInvalid}
		}
		header, err := zip.FileInfoHeader(info)
		if err != nil {
			return err
		}
		name, err := filepath.Rel(*dir, path)
		if err != nil {
			return err
		}
		header.Name = filepath.ToSlash(name)
		header.Method = zip.Deflate
		target, err := writer.CreateHeader(header)
		if err != nil {
			return err
		}
		source, err := os.Open(path)
		if err != nil {
			return err
		}
		defer source.Close()
		_, err = io.Copy(target, source)
		return err
	})
	if err != nil {
		log.Fatal(err)
	}
	if err = writer.Close(); err != nil {
		log.Fatal(err)
	}
	if err = output.Close(); err != nil {
		log.Fatal(err)
	}
}

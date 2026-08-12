package com.patience.flashcard.service;

import com.patience.flashcard.domain.Card;
import java.io.ByteArrayOutputStream;
import java.util.List;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

@Component
public class XlsxDeckExporter {

  public byte[] export(List<Card> cards) {
    try (Workbook workbook = new XSSFWorkbook();
        ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = workbook.createSheet("cards");
      Row header = sheet.createRow(0);
      header.createCell(0).setCellValue("앞");
      header.createCell(1).setCellValue("뒤");
      int rowIdx = 1;
      for (Card card : cards) {
        Row row = sheet.createRow(rowIdx++);
        row.createCell(0).setCellValue(card.getFrontText());
        row.createCell(1).setCellValue(card.getBackText());
      }
      workbook.write(out);
      return out.toByteArray();
    } catch (Exception ex) {
      throw new IllegalStateException("xlsx export failed", ex);
    }
  }
}

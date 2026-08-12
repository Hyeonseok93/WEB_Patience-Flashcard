package com.patience.flashcard.service;

import com.patience.flashcard.config.ImportProperties;
import com.patience.flashcard.web.ApiException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class XlsxDeckImporter {

  static final int MAX_CARD_TEXT = 2000;

  private final ImportProperties importProperties;
  private final DataFormatter formatter = new DataFormatter();

  public XlsxDeckImporter(ImportProperties importProperties) {
    this.importProperties = importProperties;
  }

  public void validateUpload(MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "파일이 비어 있습니다.");
    }
    if (file.getSize() > importProperties.maxBytes()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "파일 용량이 너무 큽니다. (최대 2MB)");
    }
    String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
    if (!filename.toLowerCase(Locale.ROOT).endsWith(".xlsx")) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "xlsx 파일만 업로드할 수 있습니다.");
    }
    String contentType = file.getContentType();
    if (contentType != null
        && !contentType.contains("spreadsheet")
        && !contentType.contains("excel")
        && !contentType.equals("application/octet-stream")
        && !contentType.equals("application/zip")) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "허용되지 않은 파일 형식입니다.");
    }
  }

  public List<ParsedCard> parse(MultipartFile file) {
    List<ParsedCard> rows = new ArrayList<>();
    try (InputStream in = file.getInputStream();
        Workbook workbook = new XSSFWorkbook(in)) {
      Sheet sheet = workbook.getSheetAt(0);
      if (sheet == null) {
        return rows;
      }
      for (Row row : sheet) {
        if (row == null || row.getRowNum() == 0 && looksLikeHeader(row)) {
          continue;
        }
        String front = cellText(row.getCell(0));
        String back = cellText(row.getCell(1));
        if (front.isBlank() || back.isBlank()) {
          continue;
        }
        if (front.length() > MAX_CARD_TEXT || back.length() > MAX_CARD_TEXT) {
          throw new ApiException(
              HttpStatus.BAD_REQUEST, "카드 글자 수가 너무 많습니다. (앞·뒤 각 최대 " + MAX_CARD_TEXT + "자)");
        }
        rows.add(new ParsedCard(front, back));
        if (rows.size() > importProperties.maxRows()) {
          throw new ApiException(
              HttpStatus.BAD_REQUEST, "카드 수가 너무 많습니다. (최대 " + importProperties.maxRows() + "행)");
        }
      }
    } catch (ApiException ex) {
      throw ex;
    } catch (Exception ex) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "xlsx 파일을 읽을 수 없습니다.");
    }
    return rows;
  }

  private boolean looksLikeHeader(Row row) {
    String a = cellText(row.getCell(0)).toLowerCase(Locale.ROOT);
    String b = cellText(row.getCell(1)).toLowerCase(Locale.ROOT);
    return (a.contains("front") || a.contains("앞") || a.contains("문제"))
        && (b.contains("back") || b.contains("뒤") || b.contains("답"));
  }

  private String cellText(Cell cell) {
    if (cell == null) {
      return "";
    }
    return formatter.formatCellValue(cell).replace("\r\n", "\n").replace('\r', '\n').trim();
  }

  public record ParsedCard(String front, String back) {}
}

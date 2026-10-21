import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ArrayMinSize, IsArray, IsIn, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser, Permissions } from '../auth/auth.decorators';
import { AuthUser, DocumentType } from '../common/constants';
import { IsQuantity } from '../common/validation';
import { StockDocumentsService } from './stock-documents.service';

class StockLineDto { @IsOptional() @IsString() id?:string; @IsString() itemId:string; @IsQuantity() quantity:string; @IsOptional() @IsString() locationId?:string;@IsOptional() @IsString() batchId?:string; @IsOptional() @IsString() @MaxLength(80) batchNo?:string; @IsOptional() @IsString() targetWarehouseId?:string; @IsOptional() @IsString() targetLocationId?:string; @IsOptional() @IsString() targetBatchId?:string; @IsOptional() @IsString() @MaxLength(300) notes?:string; }
class StockDocumentDto { @IsArray() @ArrayMinSize(1) @ValidateNested({each:true}) @Type(()=>StockLineDto) lines:StockLineDto[];@IsOptional()@IsString()warehouseId?:string; @IsOptional() @IsString() @MaxLength(500) notes?:string; }
class VoidDto { @IsOptional() @IsString() @MaxLength(500) reason?:string; }
class AdjustmentLineDto{@IsString()itemId:string;@IsString()locationId:string;@IsOptional()@IsString()batchId?:string;@IsString()adjustmentQty:string;@IsOptional()@IsString()@MaxLength(300)notes?:string}
class AdjustmentDto{@IsString()warehouseId:string;@IsArray()@ArrayMinSize(1)@ValidateNested({each:true})@Type(()=>AdjustmentLineDto)lines:AdjustmentLineDto[];@IsOptional()@IsString()@MaxLength(500)notes?:string}
class ItemLocationInventoryQueryDto {
  @IsString() warehouseId: string;
  @IsString() itemId: string;
  @IsIn(['INBOUND', 'OUTBOUND', 'MOVE_SOURCE', 'MOVE_TARGET']) purpose: 'INBOUND' | 'OUTBOUND' | 'MOVE_SOURCE' | 'MOVE_TARGET';
}
class SourceItemOptionsQueryDto {
  @IsString() warehouseId: string;
  @IsIn(['OUTBOUND', 'MOVE_SOURCE']) purpose: 'OUTBOUND' | 'MOVE_SOURCE';
  @IsOptional() @IsString() zoneId?: string;
  @IsOptional() @IsString() locationId?: string;
  @IsOptional() @IsString() @MaxLength(100) keyword?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() pageSize?: string;
}
class SourceDistributionQueryDto { @IsString() itemId:string; @IsOptional() @IsString() warehouseId?:string; @IsOptional() @IsString() zoneId?:string; @IsOptional() @IsString() locationId?:string; }
class FinishedInboundItemQueryDto { @IsString() itemId:string; @IsOptional() @IsString() suggestedLocationId?:string; }
class FinishedInboundLocationTreeQueryDto extends FinishedInboundItemQueryDto {
  @IsOptional() @IsString() @MaxLength(100) keyword?:string;
  @IsOptional() @IsIn(['ALL','NORMAL','AVAILABLE_CAPACITY','EMPTY']) filter?:'ALL'|'NORMAL'|'AVAILABLE_CAPACITY'|'EMPTY';
  @IsOptional() @IsIn(['ROOT','ZONE','LOCATION','SEARCH']) level?:'ROOT'|'ZONE'|'LOCATION'|'SEARCH';
  @IsOptional() @IsString() warehouseId?:string;
  @IsOptional() @IsString() zoneId?:string;
}
class TargetLocationTreeQueryDto extends FinishedInboundLocationTreeQueryDto { @IsOptional() @IsString() locationId?:string; @IsOptional() @IsString() excludeWarehouseId?:string; @IsOptional() @IsString() excludeLocationId?:string; }
class StockCheckLineDto { @IsString() locationId:string; @IsString() itemId:string; @IsOptional() @IsString() batchId?:string; @IsQuantity(true) countedQty:string; @IsOptional() @IsString() @MaxLength(300) notes?:string; }
class StockCheckDto { @IsString() warehouseId:string; @IsArray() @ArrayMinSize(1) @ValidateNested({each:true}) @Type(()=>StockCheckLineDto) lines:StockCheckLineDto[]; @IsOptional() @IsString() @MaxLength(500) notes?:string; }
class StockCheckCandidatesQueryDto { @IsString() warehouseId:string; @IsOptional() @IsString() zoneId?:string; @IsOptional() @IsString() locationId?:string; @IsOptional() @IsString() itemId?:string; }

@ApiTags('库存单据') @Controller('stock-documents')
export class StockDocumentsController{
  constructor(private readonly service:StockDocumentsService){}
  @ApiOperation({summary:'查询库存单据列表'})
  @Permissions('stock.view') @Get() list(@Query()q:any,@CurrentUser()u:AuthUser){return this.service.list(q,u);}
  @ApiOperation({summary:'导出库存单据为 CSV 文件'})
  @Permissions('stock.view') @Get('export') async export(@Query()q:any,@Res()response:any,@CurrentUser()u:AuthUser){const csv=await this.service.exportCsv(q,u);response.setHeader('Content-Type','text/csv; charset=utf-8');response.setHeader('Content-Disposition','attachment; filename="stock-documents.csv"');response.send(csv);}
  @ApiOperation({summary:'出库源物料选项（按仓库/库位过滤，带可用批次和数量）'})
  @Permissions('stock.view') @Get('source-item-options') sourceItemOptions(@Query()q:SourceItemOptionsQueryDto,@CurrentUser()u:AuthUser){return this.service.sourceItemOptions(q,u);}
  @ApiOperation({summary:'出库源物料分布（该物料在仓库各库位各批次的库存明细）'})
  @Permissions('stock.view') @Get('source-distribution') sourceDistribution(@Query()q:SourceDistributionQueryDto,@CurrentUser()u:AuthUser){return this.service.sourceItemDistribution(q.itemId,u,q);}
  @ApiOperation({summary:'指定物料在指定库位的库存分布（含批次、预留、冻结）'})
  @Permissions('stock.view') @Get('item-location-inventory') itemLocationInventory(@Query() q: ItemLocationInventoryQueryDto,@CurrentUser()u:AuthUser) { return this.service.itemLocationInventory(q,u); }
  @ApiOperation({summary:'成品入库——物料在各库位的分布（用于前端选择入库库位后判断）'})
  @Permissions('stock.create') @Get('finished-inbound/item-distribution') finishedInboundDistribution(@Query()q:FinishedInboundItemQueryDto,@CurrentUser()u:AuthUser){return this.service.finishedInboundDistribution(q.itemId,u,q.suggestedLocationId);}
  @ApiOperation({summary:'成品入库——可用库位树（按仓库/库区层级，支持容量/空置过滤）'})
  @Permissions('stock.create') @Get('finished-inbound/location-tree') finishedInboundLocationTree(@Query()q:FinishedInboundLocationTreeQueryDto,@CurrentUser()u:AuthUser){return this.service.finishedInboundLocationTree(q,u);}
  @ApiOperation({summary:'移库/成品库选择目标库位树'})
  @Permissions('stock.view') @Get('target-location-tree') targetLocationTree(@Query()q:TargetLocationTreeQueryDto,@CurrentUser()u:AuthUser){return this.service.targetLocationTree(q,u);}
  @ApiOperation({summary:'下载原材料批量入库 Excel 模板'})
  @Permissions('stock.view') @Get('material-inbound/batch-template') async materialInboundBatchTemplate(@Res()response:any){const buffer=await this.service.batchInboundTemplate('material-inbound');response.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');response.setHeader('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent('原材料批量入库模板.xlsx')}`);response.send(buffer);}
  @ApiOperation({summary:'下载成品批量入库 Excel 模板'})
  @Permissions('stock.view') @Get('finished-inbound/batch-template') async finishedInboundBatchTemplate(@Res()response:any){const buffer=await this.service.batchInboundTemplate('finished-inbound');response.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');response.setHeader('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent('成品批量入库模板.xlsx')}`);response.send(buffer);}
  @ApiOperation({summary:'查看单据详情（含明细、库位信息、审核历史）'})
  @Permissions('stock.view') @Get(':id') get(@Param('id')id:string,@CurrentUser()u:AuthUser){return this.service.get(id,u);}
  @ApiOperation({summary:'手动创建原材料入库单'})
  @Permissions('stock.create') @Post('material-inbound') inbound(@Body()dto:StockDocumentDto,@CurrentUser()u:AuthUser){return this.service.create(DocumentType.MATERIAL_INBOUND,dto,u);}
  @ApiOperation({summary:'Excel 批量导入原材料入库（逐行校验后按仓库分组生成草稿单）'})
  @Permissions('stock.create') @Post('material-inbound/batch-import') @UseInterceptors(FileInterceptor('file',{storage:memoryStorage(),limits:{fileSize:10*1024*1024,files:1}})) materialInboundBatchImport(@UploadedFile()file:Express.Multer.File|undefined,@CurrentUser()u:AuthUser){
    if (file?.originalname) file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    return this.service.batchImportInbound('material-inbound',file,u);
  }
  @ApiOperation({summary:'Excel 批量导入成品入库（逐行校验后按仓库分组生成草稿单）'})
  @Permissions('stock.create') @Post('finished-inbound/batch-import') @UseInterceptors(FileInterceptor('file',{storage:memoryStorage(),limits:{fileSize:10*1024*1024,files:1}})) finishedInboundBatchImport(@UploadedFile()file:Express.Multer.File|undefined,@CurrentUser()u:AuthUser){
    if (file?.originalname) file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    return this.service.batchImportInbound('finished-inbound',file,u);
  }
  @ApiOperation({summary:'手动创建成品入库单（每行明细必须指定入库库位）'})
  @Permissions('stock.create') @Post('finished-inbound') finishedInbound(@Body()dto:StockDocumentDto,@CurrentUser()u:AuthUser){return this.service.create(DocumentType.FINISHED_INBOUND,dto,u);}
  @ApiOperation({summary:'创建成品出库单'})
  @Permissions('stock.create') @Post('finished-outbound') outbound(@Body()dto:StockDocumentDto,@CurrentUser()u:AuthUser){return this.service.create(DocumentType.FINISHED_OUTBOUND,dto,u);}
  @ApiOperation({summary:'创建原材料销售出库单'})
  @Permissions('stock.create') @Post('material-sales-outbound') materialSalesOutbound(@Body()dto:StockDocumentDto,@CurrentUser()u:AuthUser){return this.service.create(DocumentType.MATERIAL_SALES_OUTBOUND,dto,u);}
  @ApiOperation({summary:'创建库存调整单（盘盈盘亏，不通过审核直接过账）'})
  @Permissions('stock.adjust') @Post('inventory-adjustment') adjustment(@Body()dto:AdjustmentDto,@CurrentUser()u:AuthUser){return this.service.createAdjustment(dto,u);}
  @ApiOperation({summary:'创建移库单（源仓库到目标仓库，每个明细需指定目标库位）'})
  @Permissions('stock.move') @Post('move') move(@Body()dto:StockDocumentDto,@CurrentUser()u:AuthUser){return this.service.createMove(dto,u);}
  @ApiOperation({summary:'预览移库/出库物料的可用预留分配（不入库，仅前端校验）'})
  @Permissions('stock.create') @Post('allocation-preview') allocationPreview(@Body()dto:any,@CurrentUser()u:AuthUser){return this.service.allocationPreview(dto,u);}
  @ApiOperation({summary:'盘点候选清单（指定仓库/库区/库位/物料下有库存的库位，用于生成盘点单）'})
  @Permissions('stock.count') @Get('stock-check-candidates') stockCheckCandidates(@Query()q:StockCheckCandidatesQueryDto,@CurrentUser()u:AuthUser){return this.service.stockCheckCandidates(q,u);}
  @ApiOperation({summary:'创建盘点单'})
  @Permissions('stock.count') @Post('stock-check') stockCheck(@Body()dto:StockCheckDto,@CurrentUser()u:AuthUser){return this.service.createStockCheck(dto,u);}
  @ApiOperation({summary:'更新盘点单（仅限草稿/已驳回状态）'})
  @Permissions('stock.count') @Patch(':id/stock-check') updateStockCheck(@Param('id')id:string,@Body()dto:StockCheckDto,@CurrentUser()u:AuthUser){return this.service.updateStockCheck(id,dto,u);}
  @ApiOperation({summary:'编辑草稿/已驳回/待审核单据（部分过账的原材料入库单 POSTED 明细不可改）'})
  @Permissions('stock.edit') @Patch(':id') update(@Param('id')id:string,@Body()dto:StockDocumentDto,@CurrentUser()u:AuthUser){return this.service.update(id,dto,u);}
  @ApiOperation({summary:'删除草稿单据（已驳回/待审核需先撤回）'})
  @Permissions('stock.edit') @Delete(':id') remove(@Param('id')id:string,@CurrentUser()u:AuthUser){return this.service.remove(id,u);}
  @ApiOperation({summary:'提交审核（草稿 → SUBMITTED，进入审批流）'})
  @Permissions('stock.submit') @Post(':id/submit') submit(@Param('id')id:string,@CurrentUser()u:AuthUser){return this.service.submit(id,u);}
  @ApiOperation({summary:'撤回待审核单据（SUBMITTED → DRAFT，重新编辑）'})
  @Permissions('stock.withdraw') @Post(':id/withdraw') withdraw(@Param('id')id:string,@CurrentUser()u:AuthUser){return this.service.withdraw(id,u);}
  @ApiOperation({summary:'取消单据（仅限草稿/已驳回状态）'})
  @Permissions('stock.edit') @Post(':id/cancel') cancel(@Param('id')id:string,@CurrentUser()u:AuthUser){return this.service.cancel(id,u);}
  @ApiOperation({summary:'作废单据（对已过账单据做红冲，需幂等键）'})
  @Permissions('stock.void') @Post(':id/void') void(@Param('id')id:string,@Body()dto:VoidDto,@Headers('idempotency-key')key:string|undefined,@CurrentUser()u:AuthUser){return this.service.void(id,dto.reason,key,u);}
}

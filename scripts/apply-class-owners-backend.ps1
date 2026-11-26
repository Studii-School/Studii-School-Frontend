$ErrorActionPreference = 'Stop'
$backend = 'C:\Users\user\Desktop\Projects\studii-school-backend'

function Replace-Once([string]$Path, [string]$Old, [string]$New) {
  $content = [System.IO.File]::ReadAllText($Path).Replace("`r`n", "`n")
  $Old = $Old.Replace("`r`n", "`n")
  $New = $New.Replace("`r`n", "`n")
  if (-not $content.Contains($Old)) {
    if ($content.Contains($New)) { return }
    throw "Expected source text was not found in $Path"
  }
  $content = $content.Replace($Old, $New)
  [System.IO.File]::WriteAllText($Path, $content, [System.Text.UTF8Encoding]::new($false))
}

$schema = Join-Path $backend 'prisma\schema.prisma'
Replace-Once $schema @'
  teacherId String @map("teacher_id")
  teacher   User   @relation("AssignedClassTeachers", fields: [teacherId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now()) @map("created_at")
'@ @'
  teacherId String @map("teacher_id")
  teacher   User   @relation("AssignedClassTeachers", fields: [teacherId], references: [id], onDelete: Cascade)
  isClassOwner Boolean @default(false) @map("is_class_owner")
  assignmentRole String? @map("assignment_role")

  createdAt DateTime @default(now()) @map("created_at")
'@

$dto = Join-Path $backend 'src\classes\dto\set-class-owners.dto.ts'
[System.IO.File]::WriteAllText($dto, @'
import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class SetClassOwnersDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  classOwnerUserId: string;

  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  coOwnerUserIds: string[];
}
'@, [System.Text.UTF8Encoding]::new($false))

$controller = Join-Path $backend 'src\classes\classes.controller.ts'
Replace-Once $controller "import { AssignClassTeachersDto } from './dto/assign-class-teachers.dto';`r`n" "import { AssignClassTeachersDto } from './dto/assign-class-teachers.dto';`r`nimport { SetClassOwnersDto } from './dto/set-class-owners.dto';`r`n"
Replace-Once $controller @'
  @Delete(':id/teacher')
'@ @'
  @Patch(':id/owners')
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiBody({ type: SetClassOwnersDto })
  setOwners(
    @Param('id') classId: string,
    @Body() dto: SetClassOwnersDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.classesService.setOwners(classId, dto, request.user);
  }

  @Delete(':id/teacher')
'@

$service = Join-Path $backend 'src\classes\classes.service.ts'
Replace-Once $service "import { AssignClassTeachersDto } from './dto/assign-class-teachers.dto';`r`n" "import { AssignClassTeachersDto } from './dto/assign-class-teachers.dto';`r`nimport { SetClassOwnersDto } from './dto/set-class-owners.dto';`r`n"
Replace-Once $service @'
    const ownerRows = await this.prisma.classTeacherAssignment.findMany({
      where: { schoolId, classId: { in: classes.map((item) => item.id) }, isClassOwner: true },
      select: { classId: true, teacherId: true, assignmentRole: true },
    });
    return classes.map((item: any) => ({
      ...item,
'@ @'
    const ownerRows = await this.prisma.classTeacherAssignment.findMany({
      where: { schoolId, classId: { in: classes.map((item) => item.id) }, isClassOwner: true },
      select: { classId: true, teacherId: true, assignmentRole: true },
    });
    const ownersByClass = new Map<string, Array<{ userId: string; assignmentRole: 'MAIN' | 'CO' }>>();
    for (const item of classes as any[]) {
      const explicitOwners = ownerRows.filter((row) => row.classId === item.id);
      const legacyOwners = rows.filter((row) => row.classId === item.id && row.assignmentType === 'CLASS_TEACHER');
      const source = explicitOwners.length ? explicitOwners.map((row) => ({ userId: row.teacherId, assignmentRole: row.assignmentRole })) : legacyOwners.map((row) => ({ userId: row.teacherUserId, assignmentRole: row.assignmentRole }));
      const owners = new Map<string, 'MAIN' | 'CO'>();
      for (const owner of source) if (owner.userId) owners.set(owner.userId, owner.assignmentRole === 'CO' ? 'CO' : 'MAIN');
      if (item.classTeacherId && !owners.has(item.classTeacherId)) owners.set(item.classTeacherId, 'MAIN');
      ownersByClass.set(item.id, [...owners.entries()].sort((a, b) => a[1] === b[1] ? a[0].localeCompare(b[0]) : a[1] === 'MAIN' ? -1 : 1).map(([userId, assignmentRole]) => ({ userId, assignmentRole })));
    }
    return classes.map((item: any) => ({
      ...item,
      periodTeacherAssignments: [
'@
Replace-Once $service @'
      classOwnerAssignments: [
        ...(!ownerRows.some((row) => row.classId === item.id && row.assignmentRole === 'MAIN') && item.classTeacherId
          ? [{ userId: item.classTeacherId, assignmentRole: 'MAIN' }]
          : []),
        ...ownerRows.filter((row) => row.classId === item.id).map((row) => ({ userId: row.teacherId, assignmentRole: row.assignmentRole ?? (row.teacherId === item.classTeacherId ? 'MAIN' : 'CO') })),
      ],
'@ @'
      classOwnerAssignments: ownersByClass.get(item.id) ?? [],
'@
Replace-Once $service @'
  async removeTeacher(
'@ @'
  async setOwners(classId: string, dto: SetClassOwnersDto, currentUser: AuthenticatedUser) {
    const schoolId = this.validateSchoolAdmin(currentUser);
    const schoolClass = await this.prisma.schoolClass.findFirst({ where: { id: classId, schoolId }, select: { id: true, status: true } });
    if (!schoolClass) throw new NotFoundException('Class not found');
    if (schoolClass.status === ClassStatus.ARCHIVED) throw new BadRequestException('Owners cannot be changed on an archived class');

    const coOwnerIds = [...new Set(dto.coOwnerUserIds ?? [])].filter((id) => id !== dto.classOwnerUserId);
    const ownerIds = [dto.classOwnerUserId, ...coOwnerIds];
    const users = await this.prisma.user.findMany({
      where: { id: { in: ownerIds }, schoolId, role: { in: [UserRole.TEACHER, UserRole.STAFF] }, status: UserStatus.ACTIVE },
      select: { id: true },
    });
    if (users.length !== ownerIds.length) throw new BadRequestException('Every class owner must be an active teacher or staff member in your school');

    await this.prisma.$transaction(async (transaction) => {
      await transaction.schoolClass.update({ where: { id: classId }, data: { classTeacherId: dto.classOwnerUserId } });
      await transaction.classTeacherAssignment.deleteMany({ where: { schoolId, classId, isClassOwner: true, teacherId: { notIn: ownerIds } } });
      for (const [index, teacherId] of ownerIds.entries()) {
        await transaction.classTeacherAssignment.upsert({
          where: { classId_teacherId: { classId, teacherId } },
          create: { schoolId, classId, teacherId, isClassOwner: true, assignmentRole: index === 0 ? 'MAIN' : 'CO' },
          update: { isClassOwner: true, assignmentRole: index === 0 ? 'MAIN' : 'CO' },
        });
      }
    });
    return { message: 'Class owners updated successfully' };
  }

  async removeTeacher(
'@
Replace-Once $service @'
      periodTeacherAssignments: [
      classOwnerAssignments: ownersByClass.get(item.id) ?? [],
      periodTeacherAssignments: [
'@ @'
      classOwnerAssignments: ownersByClass.get(item.id) ?? [],
      periodTeacherAssignments: [
'@

$migration = Join-Path $backend 'prisma\migrations\20261014120000_add_class_owner_roles'
New-Item -ItemType Directory -Path $migration -Force | Out-Null
[System.IO.File]::WriteAllText((Join-Path $migration 'migration.sql'), @'
ALTER TABLE "class_teacher_assignments"
  ADD COLUMN "is_class_owner" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "assignment_role" TEXT;
'@, [System.Text.UTF8Encoding]::new($false))

Write-Output 'Backend class owner API, schema, and migration applied.'

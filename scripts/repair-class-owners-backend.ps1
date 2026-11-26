$ErrorActionPreference = 'Stop'
$backend = 'C:\Users\user\Desktop\Projects\studii-school-backend'

function Read-Normalized([string]$Path) {
  [System.IO.File]::ReadAllText($Path).Replace("`r`n", "`n")
}
function Write-Normalized([string]$Path, [string]$Content) {
  [System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($false))
}

$controller = Join-Path $backend 'src\classes\classes.controller.ts'
$content = Read-Normalized $controller
$import = "import { SetClassOwnersDto } from './dto/set-class-owners.dto';`n"
$content = [regex]::Replace($content, "(?m)^(import \{ SetClassOwnersDto \} from '\./dto/set-class-owners\.dto';\n?)+", $import)
$start = $content.IndexOf("  @Patch(':id/owners')")
$end = $content.IndexOf("  @Delete(':id/teacher')", $start)
if ($start -lt 0 -or $end -lt 0) { throw 'Class owners controller block was not found.' }
$handler = @'
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

'@
$content = $content.Substring(0, $start) + $handler + $content.Substring($end)
Write-Normalized $controller $content

$service = Join-Path $backend 'src\classes\classes.service.ts'
$content = Read-Normalized $service
$content = [regex]::Replace($content, "(?m)^(import \{ SetClassOwnersDto \} from '\./dto/set-class-owners\.dto';\n?)+", $import)
$start = $content.IndexOf('  async setOwners(')
$end = $content.IndexOf('  async removeTeacher(', $start)
if ($start -lt 0 -or $end -lt 0) { throw 'Class owners service block was not found.' }
$method = @'
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

'@
$content = $content.Substring(0, $start) + $method + $content.Substring($end)
Write-Normalized $service $content
Write-Output 'Duplicate class owner declarations removed.'
